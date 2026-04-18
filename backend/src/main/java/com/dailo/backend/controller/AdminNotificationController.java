package com.dailo.backend.controller;

import com.dailo.backend.dto.admin.AdminPushRequestDto;
import com.dailo.backend.dto.admin.AdminPushResponseDto;
import com.dailo.backend.service.AdminNotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/notifications")
@RequiredArgsConstructor
@Tag(name = "Admin Notification API", description = "관리자 푸시 알림 발송")
public class AdminNotificationController {

    private final AdminNotificationService adminNotificationService;

    @Operation(summary = "전체 사용자에게 푸시 알림 발송")
    @PostMapping("/send-all")
    public ResponseEntity<AdminPushResponseDto> sendToAll(
            @Valid @RequestBody AdminPushRequestDto request
    ) {
        AdminPushResponseDto response = adminNotificationService.sendToAll(
                request.getTitle(),
                request.getBody()
        );
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "특정 사용자들에게 푸시 알림 발송")
    @PostMapping("/send")
    public ResponseEntity<AdminPushResponseDto> sendToMembers(
            @Valid @RequestBody AdminPushRequestDto request
    ) {
        if (request.getMemberIds() == null || request.getMemberIds().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        AdminPushResponseDto response = adminNotificationService.sendToMembers(
                request.getTitle(),
                request.getBody(),
                request.getMemberIds()
        );
        return ResponseEntity.ok(response);
    }
}
