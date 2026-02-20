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
     * MultipartFile을 S3에 업로드하고 S3 key를 반환
     */
    public String upload(MultipartFile file, String directory) throws IOException {
        String originalFilename = file.getOriginalFilename();
        String extension = getExtension(originalFilename);

        // 확장자 검증 로직 추가
        if (extension == null || !isAllowedExtension(extension)) {
            throw new IllegalArgumentException("허용되지 않는 파일 형식입니다. (jpg, jpeg, png, gif, webp만 가능)");
        }

        String key = directory + "/" + UUID.randomUUID() + (extension != null ? "." + extension : "");

        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(file.getContentType())
                .contentLength(file.getSize())
                .build();

        s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

        log.info("S3 업로드 완료: {}", key);
        return key;
    }

    /**
     * S3 key로 Presigned URL 생성
     */
    public String getPresignedUrl(String key) {

        if (key == null || key.isEmpty()) return null;

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

    /**
     * S3 객체 삭제
     */
    public void delete(String key) {
        if (key == null || key.isEmpty()) return;

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
