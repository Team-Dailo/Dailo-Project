package com.dailo.backend.dto;

import com.dailo.backend.entity.Event;
import com.dailo.backend.domain.enums.EventCategory;
import com.dailo.backend.domain.enums.EventStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
public class AdminEventResponse {
    private Long id;
    private String title;
    private String placeName;
    private Double latitude;
    private Double longitude;
    private LocalDateTime startAt;
    private LocalDateTime endAt;

    private List<EventCategory> categories;

    private EventStatus status;
    private String thumbnailUrl;
    private String description;
    private String hostContact;
    private boolean isAdminManaged;

    public static AdminEventResponse from(Event event) {
        return AdminEventResponse.builder()
                .id(event.getId())
                .title(event.getTitle())
                .placeName(event.getPlaceName())
                .latitude(event.getLatitude())
                .longitude(event.getLongitude())
                .startAt(event.getStartAt())
                .endAt(event.getEndAt())
                .categories(event.getCategories())
                .status(event.getStatus())
                .thumbnailUrl(event.getThumbnailUrl())
                .description(event.getDescription())
                .hostContact(event.getHostContact())
                .isAdminManaged(event.isAdminManaged())
                .build();
    }
}