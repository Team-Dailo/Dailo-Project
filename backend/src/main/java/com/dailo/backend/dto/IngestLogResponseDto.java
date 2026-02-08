package com.dailo.backend.dto;

import com.dailo.backend.entity.IngestLog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IngestLogResponseDto {

    private Long id;
    private String batchId;
    private String source;
    private Integer totalCount;
    private Integer successCount;
    private Integer failCount;
    private String errorSummary;
    private LocalDateTime createdAt;

    public static IngestLogResponseDto from(IngestLog ingestLog) {
        return IngestLogResponseDto.builder()
                .id(ingestLog.getId())
                .batchId(ingestLog.getBatchId())
                .source(ingestLog.getSource())
                .totalCount(ingestLog.getTotalCount())
                .successCount(ingestLog.getSuccessCount())
                .failCount(ingestLog.getFailCount())
                .errorSummary(ingestLog.getErrorSummary())
                .createdAt(ingestLog.getCreatedAt())
                .build();
    }
}
