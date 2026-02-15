package com.dailo.backend.dto;

import com.dailo.backend.domain.enums.ReportReason;
import com.dailo.backend.domain.enums.ReportStatus;
import com.dailo.backend.domain.enums.ReportType;
import com.dailo.backend.entity.Report;
import com.dailo.backend.entity.ReportActionEntity;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Builder
public class AdminReportDetailResponseDto {

    private Long id;
    private Long reporterId;
    private ReportType targetType;
    private Long targetId;
    private ReportReason reason;
    private String description;
    private ReportStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;
    private List<ReportActionResponseDto> actions;

    public static AdminReportDetailResponseDto from(Report report, List<ReportActionEntity> actions) {
        return AdminReportDetailResponseDto.builder()
                .id(report.getId())
                .reporterId(report.getReporterId())
                .targetType(report.getTargetType())
                .targetId(report.getTargetId())
                .reason(report.getReason())
                .description(report.getDescription())
                .status(report.getStatus())
                .createdAt(report.getCreatedAt())
                .resolvedAt(report.getResolvedAt())
                .actions(actions.stream()
                        .map(ReportActionResponseDto::from)
                        .collect(Collectors.toList()))
                .build();
    }
}
