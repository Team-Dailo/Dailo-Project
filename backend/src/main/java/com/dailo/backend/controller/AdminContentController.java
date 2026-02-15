package com.dailo.backend.controller;

import com.dailo.backend.service.AppContentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/content")
@RequiredArgsConstructor
public class AdminContentController {

    private final AppContentService appContentService;

    /**
     * 이용 안내 문구 수정 (관리자 전용)
     * PUT /api/admin/content/usage-guide
     */
    @PutMapping("/usage-guide")
    public ResponseEntity<Map<String, String>> updateUsageGuide(@RequestBody Map<String, String> body) {
        String content = body != null && body.containsKey("content") ? body.get("content") : "";
        String updated = appContentService.updateUsageGuide(content);
        return ResponseEntity.ok(Map.of("content", updated != null ? updated : ""));
    }
}
