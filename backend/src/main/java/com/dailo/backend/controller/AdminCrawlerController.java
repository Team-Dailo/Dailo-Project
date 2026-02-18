package com.dailo.backend.controller;

import com.dailo.backend.service.FestivalCrawlerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "Admin Crawler", description = "관리자 크롤러 API")
@RestController
@RequestMapping("/api/admin/crawler")
@RequiredArgsConstructor
public class AdminCrawlerController {

    private final FestivalCrawlerService festivalCrawlerService;

    @Operation(summary = "축제 데이터 수동 크롤링", description = "AI 크롤러를 수동으로 실행하여 축제 데이터를 가져옵니다.")
    @PostMapping("/festivals")
    public ResponseEntity<Map<String, Object>> crawlFestivals() {
        int savedCount = festivalCrawlerService.fetchAndSaveEvents();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "savedCount", savedCount,
                "message", savedCount + "개의 신규 축제가 저장되었습니다."
        ));
    }
}
