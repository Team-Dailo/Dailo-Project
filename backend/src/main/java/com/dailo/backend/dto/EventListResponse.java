package com.dailo.backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record EventListResponse(
        Long id,
        String title,
        String thumbnailUrl,
        LocalDateTime startAt,
        LocalDateTime endAt,
        String placeName
) {}