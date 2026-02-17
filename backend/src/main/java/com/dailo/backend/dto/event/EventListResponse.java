package com.dailo.backend.dto.event;

import com.dailo.backend.domain.enums.EventCategory;

import java.time.LocalDateTime;
import java.util.List;

public record EventListResponse(
        Long id,
        String title,
        String thumbnailUrl,
        LocalDateTime startAt,
        LocalDateTime endAt,
        String placeName,
        List<EventCategory> categories
) {}