package com.dailo.backend.dto;

import com.dailo.backend.entity.ClickLog;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClickLogResponseDto {

    private Long id;
    private Long userId;
    private Long eventId;
    private String source;
    private String requestId;
    private LocalDateTime createdAt;

    public static ClickLogResponseDto from(ClickLog clickLog) {
        return ClickLogResponseDto.builder()
                .id(clickLog.getId())
                .userId(clickLog.getUserId())
                .eventId(clickLog.getEventId())
                .source(clickLog.getSource())
                .requestId(clickLog.getRequestId())
                .createdAt(clickLog.getCreatedAt())
                .build();
    }
}
