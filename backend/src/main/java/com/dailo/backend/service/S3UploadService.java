package com.dailo.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.util.UUID;

/**
 * S3 기반 이미지 업로드 서비스.
 * AWS_S3_BUCKET 환경변수가 있으면 S3 사용, 없으면 로컬 디스크로 fallback.
 */
@Service
public class S3UploadService {

    @Value("${app.s3.bucket:}")
    private String bucket;

    @Value("${app.s3.region:ap-northeast-2}")
    private String region;

    /** CDN/CloudFront base URL (선택). 설정 시 이 URL + 경로로 반환 */
    @Value("${app.s3.base-url:}")
    private String baseUrl;

    private S3Client s3Client;

    @PostConstruct
    public void init() {
        if (bucket != null && !bucket.isBlank()) {
            s3Client = S3Client.builder()
                    .region(Region.of(region))
                    .build();
        } else {
            s3Client = null;
        }
    }

    @PreDestroy
    public void destroy() {
        if (s3Client != null) {
            s3Client.close();
        }
    }

    public boolean isEnabled() {
        return s3Client != null && bucket != null && !bucket.isBlank();
    }

    /**
     * 이미지 업로드 후 접근 가능한 URL 반환.
     * @return 전체 URL (S3 또는 CDN). 상대 경로가 아님.
     */
    public String upload(MultipartFile file) throws IOException {
        if (!isEnabled()) {
            throw new IllegalStateException("S3 upload is not enabled");
        }
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Only image files are allowed");
        }

        String ext = getExtension(file.getOriginalFilename());
        String filename = UUID.randomUUID().toString() + (ext != null ? "." + ext : "");
        String key = "uploads/" + filename;

        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType)
                .build();

        s3Client.putObject(request, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

        if (baseUrl != null && !baseUrl.isBlank()) {
            String url = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
            return url + key;
        }
        return "https://" + bucket + ".s3." + region + ".amazonaws.com/" + key;
    }

    private static String getExtension(String filename) {
        if (filename == null || filename.isEmpty()) return null;
        int i = filename.lastIndexOf('.');
        if (i <= 0 || i >= filename.length() - 1) return null;
        return filename.substring(i + 1).toLowerCase();
    }
}
