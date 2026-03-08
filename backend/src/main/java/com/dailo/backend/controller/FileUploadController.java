package com.dailo.backend.controller;

import com.dailo.backend.service.S3UploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileUploadController {

    private final S3UploadService s3UploadService;

    /**
     * 단일 파일 업로드
     * @param file 업로드할 파일
     * @param directory S3 저장 디렉토리 (기본값: posts)
     * @return S3 key
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "directory", defaultValue = "posts") String directory) {

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            return ResponseEntity.badRequest().build();
        }

        try {
            String key = s3UploadService.upload(file, directory);
            Map<String, String> response = new HashMap<>();
            response.put("key", key);
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * 다중 파일 업로드
     * @param files 업로드할 파일 목록
     * @param directory S3 저장 디렉토리 (기본값: posts)
     * @return S3 key 목록
     */
    @PostMapping(value = "/uploads", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, List<String>>> uploadMultiple(
            @RequestParam("files") List<MultipartFile> files,
            @RequestParam(value = "directory", defaultValue = "posts") String directory) {

        if (files == null || files.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        List<String> keys = new ArrayList<>();
        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;

            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                continue;
            }

            try {
                String key = s3UploadService.upload(file, directory);
                keys.add(key);
            } catch (IOException e) {
                // 개별 파일 실패 시 계속 진행
            }
        }

        Map<String, List<String>> response = new HashMap<>();
        response.put("keys", keys);
        return ResponseEntity.ok(response);
    }

    /**
     * S3 key로 Presigned URL 조회
     */
    @GetMapping("/presigned-url")
    public ResponseEntity<Map<String, String>> getPresignedUrl(@RequestParam("key") String key) {
        String url = s3UploadService.getPresignedUrl(key);
        Map<String, String> response = new HashMap<>();
        response.put("url", url);
        return ResponseEntity.ok(response);
    }
}
