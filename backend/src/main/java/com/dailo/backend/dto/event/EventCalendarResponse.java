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
    private EventCategory category;  // 색상 구분용 (FESTIVAL, ACADEMIC 등)
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private boolean isBookmarked;
}