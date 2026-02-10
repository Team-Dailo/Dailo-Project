package com.dailo.backend.controller;

import com.dailo.backend.domain.enums.SyncStatus;
import com.dailo.backend.dto.SyncLogCompleteRequestDto;
import com.dailo.backend.dto.SyncLogResponseDto;
import com.dailo.backend.dto.SyncLogStartRequestDto;
import com.dailo.backend.service.SyncLogService;
import com.dailo.backend.util.SecurityUtil;
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

    private static Long adminIdOr401() {
        Long id = SecurityUtil.getCurrentMemberId();
        if (id == null) throw new org.springframework.security.access.AccessDeniedException("인증이 필요합니다.");
        return id;
    }

    @GetMapping
    public ResponseEntity<Page<SyncLogResponseDto>> getLogs(
            @RequestParam(required = false) String sourceType,
            @RequestParam(required = false) SyncStatus status,
            @PageableDefault(size = 20, sort = "startedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(syncLogService.getLogs(adminIdOr401(), sourceType, status, pageable));
    }

    @GetMapping("/{logId}")
    public ResponseEntity<SyncLogResponseDto> getLog(@PathVariable Long logId) {
        return ResponseEntity.ok(syncLogService.getLog(adminIdOr401(), logId));
    }

    @PostMapping("/start")
    public ResponseEntity<SyncLogResponseDto> startSync(@Valid @RequestBody SyncLogStartRequestDto requestDto) {
        return ResponseEntity.ok(syncLogService.startSync(adminIdOr401(), requestDto));
    }

    @PutMapping("/{logId}/complete")
    public ResponseEntity<SyncLogResponseDto> completeSync(
            @PathVariable Long logId,
            @Valid @RequestBody SyncLogCompleteRequestDto requestDto) {
        return ResponseEntity.ok(syncLogService.completeSync(adminIdOr401(), logId, requestDto));
    }
}
