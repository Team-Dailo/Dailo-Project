package com.dailo.backend.controller;

import com.dailo.backend.service.AppContentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/content")
@RequiredArgsConstructor
public class ContentController {

    private final AppContentService appContentService;

    /**
     * 이용 안내 문구 조회 (비로그인 포함 누구나)
     * GET /api/content/usage-guide
     */
    @GetMapping("/usage-guide")
    public ResponseEntity<Map<String, String>> getUsageGuide() {
        String content = appContentService.getUsageGuide();
        return ResponseEntity.ok(Map.of("content", content != null ? content : ""));
    }

    /**
     * 개인정보처리방침 조회 (비로그인 포함)
     * GET /api/content/privacy-policy
     */
    @GetMapping("/privacy-policy")
    public ResponseEntity<Map<String, String>> getPrivacyPolicy() {
        String content = appContentService.getPrivacyPolicy();
        return ResponseEntity.ok(Map.of("content", content != null ? content : ""));
    }
}
