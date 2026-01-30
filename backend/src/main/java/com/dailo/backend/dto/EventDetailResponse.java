package com.dailo.backend.dto;

import com.dailo.backend.domain.enums.EventCategory;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record EventDetailResponse(
        Long id,
        String title,
        List<String> posterUrls,
        LocalDateTime startDateTime,
        LocalDateTime endDateTime,
        String placeName,
        String placeAddress,
        Double latitude,
        Double longitude,
        String description,
        List<EventCategory> categories
) {
}