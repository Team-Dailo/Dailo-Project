package com.dailo.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.io.IOException;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class S3UploadService {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Value("${cloud.aws.s3.bucket}")
    private String bucket;

    @Value("${cloud.aws.s3.presigned-url-expiration-minutes}")
    private int presignedUrlExpirationMinutes;

    /**
     * 공개 객체 서빙 베이스 URL. R2 등 CloudFront가 없는 환경에서 설정.
     * 비어 있으면 기존 동작(CloudFront /static 상대경로)을 유지.
     * 예: https://pub-xxxx.r2.dev  또는  https://cdn.kodeploy.com
     */
    @Value("${cloud.aws.s3.public-base-url:}")
    private String publicBaseUrl;

    public String upload(MultipartFile file, String directory) throws IOException {
        String originalFilename = file.getOriginalFilename();
        String extension = getExtension(originalFilename);

        if (extension == null || !isAllowedExtension(extension)) {
            throw new IllegalArgumentException("허용되지 않는 파일 형식입니다. (jpg, jpeg, png, gif, webp만 가능)");
        }

        // CloudFront /static/* → S3 키 매칭을 위해 static/ 접두사 포함
        String key = "static/" + directory + "/" + UUID.randomUUID() + "." + extension;

        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(file.getContentType())
                .contentLength(file.getSize())
                .build();

        s3Client.putObject(
                putObjectRequest,
                RequestBody.fromInputStream(file.getInputStream(), file.getSize())
        );

        log.info("S3 업로드 완료: {}", key);
        return key;
    }

    public String resolveUrl(String value) {
        if (value == null || value.isBlank()) return null;
        if (value.startsWith("http://") || value.startsWith("https://")) return value;
        if (value.startsWith("/")) return value;
        // static/ 접두사가 포함된 키 → 공개 URL로 변환
        if (value.startsWith("static/")) {
            // R2 등 공개 베이스 URL이 설정된 경우: 절대 URL (CloudFront 없음)
            if (publicBaseUrl != null && !publicBaseUrl.isBlank()) {
                String base = publicBaseUrl.endsWith("/")
                        ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1)
                        : publicBaseUrl;
                return base + "/" + value;
            }
            // 기본(AWS): CloudFront → S3 직접 매칭되는 /static/... 상대경로
            return "/" + value;
        }
        // 레거시 키(접두사 없음) → presigned URL 폴백
        return getPresignedUrl(value);
    }

    public String getPresignedUrl(String key) {
        if (key == null || key.isBlank()) return null; // [CHANGED]

        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(presignedUrlExpirationMinutes))
                .getObjectRequest(getObjectRequest)
                .build();

        PresignedGetObjectRequest presignedRequest = s3Presigner.presignGetObject(presignRequest);
        return presignedRequest.url().toString();
    }

    public void delete(String key) {
        if (key == null || key.isBlank()) return; // [CHANGED]

        DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build();

        s3Client.deleteObject(deleteObjectRequest);
        log.info("S3 삭제 완료: {}", key);
    }

    private String getExtension(String filename) {
        if (filename == null || filename.isEmpty()) return null;
        int i = filename.lastIndexOf('.');
        if (i <= 0 || i >= filename.length() - 1) return null;
        return filename.substring(i + 1).toLowerCase();
    }

    private boolean isAllowedExtension(String extension) {
        List<String> allowed = Arrays.asList("jpg", "jpeg", "png", "gif", "webp");
        return allowed.contains(extension.toLowerCase());
    }
}