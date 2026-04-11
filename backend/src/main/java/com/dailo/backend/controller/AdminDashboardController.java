package com.dailo.backend.controller;

import com.dailo.backend.dto.admin.DashboardResponseDto;
import com.dailo.backend.service.AdminDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
