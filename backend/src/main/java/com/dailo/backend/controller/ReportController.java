package com.dailo.backend.controller;

import com.dailo.backend.dto.ReportRequestDto;
import com.dailo.backend.dto.ReportResponseDto;
import com.dailo.backend.service.ReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    // 1. 신고 생성
    @PostMapping
    public ResponseEntity<ReportResponseDto> createReport(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody ReportRequestDto requestDto) {

        ReportResponseDto response = reportService.createReport(requestDto, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // 2. 내 신고 목록
    @GetMapping("/my")
    public ResponseEntity<Page<ReportResponseDto>> getMyReports(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(reportService.getMyReports(userId, pageable));
    }
}
