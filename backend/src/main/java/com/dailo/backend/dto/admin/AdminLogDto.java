package com.dailo.backend.dto.admin;

import com.dailo.backend.entity.AdminLog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminLogDto {
    private Long id;
    private Long adminId;
    private String adminEmail;
    private String action;
    private String targetType;
    private Long targetId;
    private String description;
    private String ipAddress;
    private LocalDateTime createdAt;

    public static AdminLogDto from(AdminLog entity) {
        return AdminLogDto.builder()
                .id(entity.getId())
                .adminId(entity.getAdminId())
                .adminEmail(entity.getAdminEmail())
                .action(entity.getAction())
                .targetType(entity.getTargetType())
                .targetId(entity.getTargetId())
                .description(entity.getDescription())
                .ipAddress(entity.getIpAddress())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
