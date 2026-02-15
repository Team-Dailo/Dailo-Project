package com.dailo.backend.dto;

import com.dailo.backend.domain.enums.SyncStatus;
import com.dailo.backend.entity.SyncLog;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class SyncLogResponseDto {

    private Long id;
    private String sourceType;
    private SyncStatus status;
    private Integer totalCount;
    private Integer successCount;
    private Integer failCount;
    private String errorMessage;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;

    public static SyncLogResponseDto from(SyncLog syncLog) {
        return SyncLogResponseDto.builder()
                .id(syncLog.getId())
                .sourceType(syncLog.getSourceType())
                .status(syncLog.getStatus())
                .totalCount(syncLog.getTotalCount())
                .successCount(syncLog.getSuccessCount())
                .failCount(syncLog.getFailCount())
                .errorMessage(syncLog.getErrorMessage())
                .startedAt(syncLog.getStartedAt())
                .completedAt(syncLog.getCompletedAt())
                .build();
    }
}
