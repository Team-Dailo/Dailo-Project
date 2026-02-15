package com.dailo.backend.controller;

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
 * POST /api/admin/upload → multipart file → 저장 후 URL 경로 반환
 */
@RestController
@RequestMapping("/api/admin")
public class AdminUploadController {

    @Value("${app.upload.dir:./uploads}")
    private String uploadDir;

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
            Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(dir);

            String ext = getExtension(file.getOriginalFilename());
            String filename = UUID.randomUUID().toString() + (ext != null ? "." + ext : "");
            Path target = dir.resolve(filename);
            Files.copy(file.getInputStream(), target);

            // 클라이언트에서 사용할 URL 경로 (호스트는 프론트에서 API_BASE_URL로 붙임)
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
