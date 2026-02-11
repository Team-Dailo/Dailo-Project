package com.dailo.backend.dto.event;

import com.dailo.backend.entity.Event;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventMapResponse {
    private Long id;
    private String title;
    private Double latitude;
    private Double longitude;
    private String category;      // 대표 카테고리 1개
    private String filterGroup;    // 규모/구분 (마커 색상용: CHUNGJU_CITY, UNIVERSITY, COLLEGE, CLUB 등)
    private String thumbnailUrl;
    private String status;        // 행사 상태 (ACTIVE 등)

    public static EventMapResponse from(Event event) {
        String mainCategory = "ETC";
        if (event.getCategories() != null && !event.getCategories().isEmpty()) {
            mainCategory = event.getCategories().get(0).name();
        }
        String filterGroupName = event.getFilterGroup() != null ? event.getFilterGroup().name() : null;

        return EventMapResponse.builder()
                .id(event.getId())
                .title(event.getTitle())
                .latitude(event.getLatitude())
                .longitude(event.getLongitude())
                .category(mainCategory)
                .filterGroup(filterGroupName)
                .thumbnailUrl(event.getThumbnailUrl())
                .status(event.getStatus().name())
                .build();
    }
}