package com.dailo.backend.dto;

import com.dailo.backend.domain.enums.ReportAction;
import com.dailo.backend.entity.ReportActionEntity;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ReportActionResponseDto {

    private Long id;
    private Long reportId;
    private Long adminId;
    private ReportAction actionType;
    private String reason;
    private LocalDateTime createdAt;

    public static ReportActionResponseDto from(ReportActionEntity entity) {
        return ReportActionResponseDto.builder()
                .id(entity.getId())
                .reportId(entity.getReport().getId())
                .adminId(entity.getAdminId())
                .actionType(entity.getActionType())
                .reason(entity.getReason())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
