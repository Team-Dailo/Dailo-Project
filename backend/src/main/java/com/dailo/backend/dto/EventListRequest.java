package com.dailo.backend.dto;

import com.dailo.backend.domain.enums.EventCategory;
import org.springframework.format.annotation.DateTimeFormat;
import java.time.LocalDate;
import java.util.List;

public record EventListRequest(
        Integer page,
        Integer size,

        @DateTimeFormat(pattern = "yyyy-MM-dd")
        LocalDate startDateTime,

        @DateTimeFormat(pattern = "yyyy-MM-dd")
        LocalDate endDateTime,

        List<EventCategory> categories,
        String sort
) {
    // page, size가 null인 경우 기본값 설정
    public EventListRequest {
        if (page == null) page = 1;
        if (size == null) size = 20;
    }

    // 리스트가 비어있지 않은지 확인
    public boolean hasCategory() {
        return categories != null && !categories.isEmpty();
    }

    // 날짜 필터 여부 확인
    public boolean hasDateFilter() {
        return startDateTime != null && endDateTime != null;
    }
}