package com.dailo.backend.dto.event;

import com.dailo.backend.domain.enums.EventCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventCalendarResponse {

    private Long id;
    private String title;
    private EventCategory category;
    /** 규모/지도·달력 마커 색상 (CHUNGJU_CITY, UNIVERSITY, COLLEGE, CLUB 등) */
    private String filterGroup;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private boolean isBookmarked;
}