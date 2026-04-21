package com.dailo.backend.controller;

import com.dailo.backend.dto.admin.DailyActivityStatsDto;
import com.dailo.backend.dto.admin.DashboardResponseDto;
import com.dailo.backend.service.AdminDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    @GetMapping
    public ResponseEntity<DashboardResponseDto> getDashboard() {
        DashboardResponseDto response = adminDashboardService.getDashboardStats();
        return ResponseEntity.ok(response);
    }

    /**
     * 일일 시간대별 사용자 활동 통계
     * @param date 조회할 날짜 (기본값: 오늘)
     */
    @GetMapping("/daily-activity")
    public ResponseEntity<DailyActivityStatsDto> getDailyActivity(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (date == null) {
            date = LocalDate.now();
        }
        DailyActivityStatsDto response = adminDashboardService.getDailyActivityStats(date);
        return ResponseEntity.ok(response);
    }
}
