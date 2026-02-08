package com.dailo.backend.controller;

import com.dailo.backend.dto.IngestLogResponseDto;
import com.dailo.backend.service.AdminIngestLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/ingest-logs")
@RequiredArgsConstructor
public class AdminIngestLogController {

    private final AdminIngestLogService adminIngestLogService;

    /**
     * 수집 로그 목록 조회
     * GET /api/admin/ingest-logs?source=crawling
     */
    @GetMapping
    public ResponseEntity<Page<IngestLogResponseDto>> getIngestLogs(
            @RequestHeader("X-User-Id") Long adminId,
            @RequestParam(required = false) String source,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<IngestLogResponseDto> response = adminIngestLogService.getIngestLogs(adminId, source, pageable);
        return ResponseEntity.ok(response);
    }

    /**
     * 수집 로그 상세 조회
     * GET /api/admin/ingest-logs/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<IngestLogResponseDto> getIngestLog(
            @RequestHeader("X-User-Id") Long adminId,
            @PathVariable Long id) {
        IngestLogResponseDto response = adminIngestLogService.getIngestLog(adminId, id);
        return ResponseEntity.ok(response);
    }
}
