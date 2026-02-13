package com.dailo.backend.dto.event;

import com.dailo.backend.domain.enums.EventCategory;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;
import java.util.List;

public record EventListRequest(
        Integer page,
        Integer size,

        @DateTimeFormat(pattern = "yyyy-MM-dd")
        LocalDate startAt,

        @DateTimeFormat(pattern = "yyyy-MM-dd")
        LocalDate endAt,

        List<EventCategory> categories,

        String region,  // 지역 필터
        String keyword, // 검색어
        String sort     // 정렬
) {
    public EventListRequest {
        if (page == null) page = 1;
        if (size == null) size = 20;
    }

    public boolean hasCategory() {
        return categories != null && !categories.isEmpty();
    }

    public boolean hasDateFilter() {
        return startAt != null && endAt != null;
    }

    public boolean hasKeyword() {
        return keyword != null && !keyword.isBlank();
    }
}