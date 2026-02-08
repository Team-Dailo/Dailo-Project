package com.dailo.backend.controller;

import com.dailo.backend.dto.ClickLogRequestDto;
import com.dailo.backend.dto.ClickLogResponseDto;
import com.dailo.backend.dto.SearchLogRequestDto;
import com.dailo.backend.dto.SearchLogResponseDto;
import com.dailo.backend.service.LogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/logs")
@RequiredArgsConstructor
public class LogController {

    private final LogService logService;

    // ==================== Search Log ====================

    /**
     * 검색 로그 기록
     * POST /api/logs/search
     */
    @PostMapping("/search")
    public ResponseEntity<SearchLogResponseDto> logSearch(
            @RequestBody SearchLogRequestDto requestDto,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        SearchLogResponseDto response = logService.logSearch(requestDto, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * 인기 검색어 조회
     * GET /api/logs/search/top
     */
    @GetMapping("/search/top")
    public ResponseEntity<List<String>> getTopKeywords(
            @RequestParam(defaultValue = "10") int limit) {
        List<String> keywords = logService.getTopKeywords(limit);
        return ResponseEntity.ok(keywords);
    }

    // ==================== Click Log ====================

    /**
     * 클릭 로그 기록
     * POST /api/logs/click
     */
    @PostMapping("/click")
    public ResponseEntity<ClickLogResponseDto> logClick(
            @RequestBody ClickLogRequestDto requestDto,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        ClickLogResponseDto response = logService.logClick(requestDto, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * 이벤트 클릭 수 조회
     * GET /api/logs/click/count/{eventId}
     */
    @GetMapping("/click/count/{eventId}")
    public ResponseEntity<Long> getClickCount(@PathVariable Long eventId) {
        long count = logService.getClickCount(eventId);
        return ResponseEntity.ok(count);
    }

    /**
     * 인기 이벤트 조회 (클릭 수 기준)
     * GET /api/logs/click/top
     */
    @GetMapping("/click/top")
    public ResponseEntity<List<Long>> getTopClickedEvents(
            @RequestParam(defaultValue = "10") int limit) {
        List<Long> eventIds = logService.getTopClickedEvents(limit);
        return ResponseEntity.ok(eventIds);
    }
}
