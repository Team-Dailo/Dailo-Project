package com.dailo.backend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminEventViewCountDto {
    private Long eventId;
    private String title;
    /** 전체 기간 누적 조회수 (click_logs 기준) */
    private long totalViewCount;
    /** 최근 7일 조회수 (Event.viewCount7d) */
    private int viewCount7d;
    /** 최근 30일 조회수 (Event.viewCount30d) */
    private int viewCount30d;
}

