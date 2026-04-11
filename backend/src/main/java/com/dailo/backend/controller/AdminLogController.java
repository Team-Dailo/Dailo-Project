package com.dailo.backend.controller;

import com.dailo.backend.dto.admin.AdminLogDto;
import com.dailo.backend.service.AdminLogService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/logs")
@RequiredArgsConstructor
@Tag(name = "Admin Log API", description = "관리자 활동 로그 조회")
public class AdminLogController {

    private final AdminLogService adminLogService;

    @Operation(summary = "전체 활동 로그 조회")
    @GetMapping
    public ResponseEntity<Page<AdminLogDto>> getLogs(@PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(adminLogService.getLogs(pageable));
    }

    @Operation(summary = "특정 관리자의 활동 로그 조회")
    @GetMapping("/admin/{adminId}")
    public ResponseEntity<Page<AdminLogDto>> getLogsByAdmin(
            @PathVariable Long adminId,
            @PageableDefault(size = 50) Pageable pageable
    ) {
        return ResponseEntity.ok(adminLogService.getLogsByAdmin(adminId, pageable));
    }

    @Operation(summary = "특정 액션 타입의 로그 조회")
    @GetMapping("/action/{action}")
    public ResponseEntity<Page<AdminLogDto>> getLogsByAction(
            @PathVariable String action,
            @PageableDefault(size = 50) Pageable pageable
    ) {
        return ResponseEntity.ok(adminLogService.getLogsByAction(action, pageable));
    }

    @Operation(summary = "특정 대상 타입의 로그 조회")
    @GetMapping("/target/{targetType}")
    public ResponseEntity<Page<AdminLogDto>> getLogsByTargetType(
            @PathVariable String targetType,
            @PageableDefault(size = 50) Pageable pageable
    ) {
        return ResponseEntity.ok(adminLogService.getLogsByTargetType(targetType, pageable));
    }
}
