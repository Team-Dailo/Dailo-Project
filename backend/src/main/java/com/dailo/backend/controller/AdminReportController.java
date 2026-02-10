package com.dailo.backend.controller;

import com.dailo.backend.domain.enums.ReportStatus;
import com.dailo.backend.domain.enums.ReportType;
import com.dailo.backend.dto.AdminReportDetailResponseDto;
import com.dailo.backend.dto.ReportActionRequestDto;
import com.dailo.backend.dto.ReportActionResponseDto;
import com.dailo.backend.dto.ReportResponseDto;
import com.dailo.backend.service.AdminReportService;
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
@RequestMapping("/api/admin/reports")
@RequiredArgsConstructor
public class AdminReportController {

    private final AdminReportService adminReportService;

    private static Long adminIdOr401() {
        Long id = SecurityUtil.getCurrentMemberId();
        if (id == null) throw new org.springframework.security.access.AccessDeniedException("인증이 필요합니다.");
        return id;
    }

    @GetMapping
    public ResponseEntity<Page<ReportResponseDto>> getReports(
            @RequestParam(required = false) ReportStatus status,
            @RequestParam(required = false) ReportType targetType,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(adminReportService.getReports(adminIdOr401(), status, targetType, pageable));
    }

    @GetMapping("/{reportId}")
    public ResponseEntity<AdminReportDetailResponseDto> getReportDetail(@PathVariable Long reportId) {
        return ResponseEntity.ok(adminReportService.getReportDetail(adminIdOr401(), reportId));
    }

    @PostMapping("/{reportId}/action")
    public ResponseEntity<ReportActionResponseDto> processReport(
            @PathVariable Long reportId,
            @Valid @RequestBody ReportActionRequestDto requestDto) {
        return ResponseEntity.ok(adminReportService.processReport(reportId, adminIdOr401(), requestDto));
    }
}
