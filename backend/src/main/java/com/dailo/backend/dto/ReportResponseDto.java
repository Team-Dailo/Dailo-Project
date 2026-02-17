package com.dailo.backend.dto;

import com.dailo.backend.domain.enums.ReportReason;
import com.dailo.backend.domain.enums.ReportStatus;
import com.dailo.backend.domain.enums.ReportType;
import com.dailo.backend.entity.Report;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ReportResponseDto {

    private Long id;
    private Long reporterId;
    private ReportType targetType;
    private Long targetId;
    /** 신고 대상 표시용 (게시물 제목, 댓글 내용 요약 등) */
    private String targetDisplay;
    private ReportReason reason;
    private String description;
    private ReportStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;

    public static ReportResponseDto from(Report report) {
        return ReportResponseDto.builder()
                .id(report.getId())
                .reporterId(report.getReporterId())
                .targetType(report.getTargetType())
                .targetId(report.getTargetId())
                .targetDisplay(null)
                .reason(report.getReason())
                .description(report.getDescription())
                .status(report.getStatus())
                .createdAt(report.getCreatedAt())
                .resolvedAt(report.getResolvedAt())
                .build();
    }

    public static ReportResponseDto from(Report report, String targetDisplay) {
        return ReportResponseDto.builder()
                .id(report.getId())
                .reporterId(report.getReporterId())
                .targetType(report.getTargetType())
                .targetId(report.getTargetId())
                .targetDisplay(targetDisplay != null ? targetDisplay : "")
                .reason(report.getReason())
                .description(report.getDescription())
                .status(report.getStatus())
                .createdAt(report.getCreatedAt())
                .resolvedAt(report.getResolvedAt())
                .build();
    }
}
