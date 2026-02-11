package com.dailo.backend.dto.location;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/** 완료된 체류 세션 조회 응답 (참여한 축제 / 체류 미션 기록용) */
@Getter
@Builder
public class StaySessionResponseDto {
    private Long id;
    private Long eventId;
    private String eventTitle;
    private String placeName;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    /** 체류 시간(분) */
    private long durationMinutes;
}
