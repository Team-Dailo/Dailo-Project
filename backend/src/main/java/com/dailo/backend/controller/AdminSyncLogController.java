package com.dailo.backend.controller;

import com.dailo.backend.domain.enums.SyncStatus;
import com.dailo.backend.dto.SyncLogCompleteRequestDto;
import com.dailo.backend.dto.SyncLogResponseDto;
import com.dailo.backend.dto.SyncLogStartRequestDto;
import com.dailo.backend.service.SyncLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/sync-logs")
@RequiredArgsConstructor
public class AdminSyncLogController {

    private final SyncLogService syncLogService;

    // 동기화 로그 목록 조회
    @GetMapping
    public ResponseEntity<Page<SyncLogResponseDto>> getLogs(
            @RequestHeader("X-User-Id") Long adminId,
            @RequestParam(required = false) String sourceType,
            @RequestParam(required = false) SyncStatus status,
            @PageableDefault(size = 20, sort = "startedAt", direction = Sort.Direction.DESC) Pageable pageable) {

        return ResponseEntity.ok(syncLogService.getLogs(adminId, sourceType, status, pageable));
    }

    // 동기화 로그 상세 조회
    @GetMapping("/{logId}")
    public ResponseEntity<SyncLogResponseDto> getLog(
            @RequestHeader("X-User-Id") Long adminId,
            @PathVariable Long logId) {

        return ResponseEntity.ok(syncLogService.getLog(adminId, logId));
    }

    // 동기화 시작 기록
    @PostMapping("/start")
    public ResponseEntity<SyncLogResponseDto> startSync(
            @RequestHeader("X-User-Id") Long adminId,
            @Valid @RequestBody SyncLogStartRequestDto requestDto) {

        return ResponseEntity.ok(syncLogService.startSync(adminId, requestDto));
    }

    // 동기화 완료 기록
    @PutMapping("/{logId}/complete")
    public ResponseEntity<SyncLogResponseDto> completeSync(
            @RequestHeader("X-User-Id") Long adminId,
            @PathVariable Long logId,
            @Valid @RequestBody SyncLogCompleteRequestDto requestDto) {

        return ResponseEntity.ok(syncLogService.completeSync(adminId, logId, requestDto));
    }
}
