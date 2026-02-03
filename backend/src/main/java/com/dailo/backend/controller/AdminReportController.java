package com.dailo.backend.controller;

import com.dailo.backend.domain.enums.ReportStatus;
import com.dailo.backend.domain.enums.ReportType;
import com.dailo.backend.dto.AdminReportDetailResponseDto;
import com.dailo.backend.dto.ReportActionRequestDto;
import com.dailo.backend.dto.ReportActionResponseDto;
import com.dailo.backend.dto.ReportResponseDto;
import com.dailo.backend.service.AdminReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
public class AdminReportController {

    private final AdminReportService adminReportService;

    // 신고 목록 조회 (필터링)
    @GetMapping
    public ResponseEntity<Page<ReportResponseDto>> getReports(
            @RequestHeader("X-User-Id") Long adminId,
            @RequestParam(required = false) ReportStatus status,
            @RequestParam(required = false) ReportType targetType,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        return ResponseEntity.ok(adminReportService.getReports(adminId, status, targetType, pageable));
    }

    // 신고 상세 조회
    @GetMapping("/{reportId}")
    public ResponseEntity<AdminReportDetailResponseDto> getReportDetail(
            @RequestHeader("X-User-Id") Long adminId,
            @PathVariable Long reportId) {

        return ResponseEntity.ok(adminReportService.getReportDetail(adminId, reportId));
    }

    // 신고 처리
    @PostMapping("/{reportId}/action")
    public ResponseEntity<ReportActionResponseDto> processReport(
            @PathVariable Long reportId,
            @RequestHeader("X-User-Id") Long adminId,
            @Valid @RequestBody ReportActionRequestDto requestDto) {

        return ResponseEntity.ok(adminReportService.processReport(reportId, adminId, requestDto));
    }
}
