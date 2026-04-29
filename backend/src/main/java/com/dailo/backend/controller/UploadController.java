package com.dailo.backend.controller;

import com.dailo.backend.service.S3UploadService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * 로그인 사용자 이미지 업로드 (게시글 사진 등)
 * POST /api/upload → multipart file → 저장 후 URL 경로 반환
 * 배포환경(app.upload.use-s3=true)에서는 S3에 저장하고 /static/... 경로 반환
 */
@RestController
@RequestMapping("/api")
public class UploadController {

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    @Value("${app.upload.use-s3:false}")
    private boolean useS3;

    /** S3 사용 시 CloudFront/정적 서빙 경로 (예: /static) */
    @Value("${app.upload.static-base-path:/static}")
    private String staticBasePath;

    @Autowired(required = false)
    private S3UploadService s3UploadService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> upload(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().build();
        }

        try {
            if (useS3 && s3UploadService != null) {
                String key = s3UploadService.upload(file, "uploads");
                // resolveUrl: "static/uploads/..." → "/static/uploads/..." (CloudFront 경로)
                // staticBasePath를 직접 붙이면 "/static/static/..." 중복이 생기므로 resolveUrl 사용
                String path = s3UploadService.resolveUrl(key);
                Map<String, String> body = new HashMap<>();
                body.put("path", path);
                return ResponseEntity.ok(body);
            }

            Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(dir);

            String ext = getExtension(file.getOriginalFilename());
            String filename = UUID.randomUUID().toString() + (ext != null ? "." + ext : "");
            Path target = dir.resolve(filename);
            Files.copy(file.getInputStream(), target);

            String path = "/uploads/" + filename;
            Map<String, String> body = new HashMap<>();
            body.put("path", path);
            return ResponseEntity.ok(body);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    private static String getExtension(String filename) {
        if (filename == null || filename.isEmpty()) return null;
        int i = filename.lastIndexOf('.');
        if (i <= 0 || i >= filename.length() - 1) return null;
        return filename.substring(i + 1).toLowerCase();
    }
}
