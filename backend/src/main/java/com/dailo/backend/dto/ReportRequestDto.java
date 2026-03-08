package com.dailo.backend.dto;

import com.dailo.backend.domain.enums.ReportReason;
import com.dailo.backend.domain.enums.ReportType;
import com.dailo.backend.entity.Report;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ReportRequestDto {

    @NotNull(message = "targetType is required")
    private ReportType targetType;

    @NotNull(message = "targetId is required")
    private Long targetId;

    @NotNull(message = "reason is required")
    private ReportReason reason;

    private String description;

    public Report toEntity(Long reporterId) {
        return Report.builder()
                .reporterId(reporterId)
                .targetType(targetType)
                .targetId(targetId)
                .reason(reason)
                .description(description)
                .build();
    }
}
