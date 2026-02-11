package com.dailo.backend.dto.event;

import com.dailo.backend.domain.enums.EventCategory;
import com.dailo.backend.domain.enums.EventFilterGroup;
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
    private EventCategory category;  // 색상 구분용
    private EventFilterGroup filterGroup;  // 달력 필터 (충주시/대학교/총학생회/단과대/동아리)
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private boolean isBookmarked;
}