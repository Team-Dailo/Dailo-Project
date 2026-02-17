package com.dailo.backend.controller;

import com.dailo.backend.service.S3UploadService;
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
 * 관리자 전용 이미지 업로드 (행사 포스터/썸네일 등)
 * POST /api/admin/upload → multipart file → S3 또는 로컬 저장 후 URL 반환
 */
@RestController
@RequestMapping("/api/admin")
public class AdminUploadController {

    private final S3UploadService s3UploadService;

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

    public AdminUploadController(S3UploadService s3UploadService) {
        this.s3UploadService = s3UploadService;
    }

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
            if (s3UploadService.isEnabled()) {
                String url = s3UploadService.upload(file);
                Map<String, String> body = new HashMap<>();
                body.put("path", url);
                return ResponseEntity.ok(body);
            }

            // 로컬 fallback (S3 미설정 시)
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
