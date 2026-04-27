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
    private String placeAddress;
    private String regionName;
    private Double latitude;
    private Double longitude;
    private LocalDateTime startAt;
    private LocalDateTime endAt;

    private List<EventCategory> categories;

    private EventStatus status;
    /** 규모(지도·달력 마커 색상): CHUNGJU_CITY, UNIVERSITY, STUDENT_COUNCIL, COLLEGE, CLUB — 관리자 화면·지도 표시 일치용 */
    private String filterGroup;
    private String thumbnailKey;
    private String thumbnailUrl;
    private String description;
    private String hostContact;
    private boolean isAdminManaged;
    /** 소식/타임테이블/푸드트럭/축제부스 JSON */
    private String extraJson;

    public static AdminEventResponse from(Event event) {
        return AdminEventResponse.builder()
                .id(event.getId())
                .title(event.getTitle())
                .placeName(event.getPlaceName())
                .placeAddress(event.getPlaceAddress())
                .regionName(event.getRegionName())
                .latitude(event.getLatitude())
                .longitude(event.getLongitude())
                .startAt(event.getStartAt())
                .endAt(event.getEndAt())
                .categories(event.getCategories())
                .status(event.getStatus())
                .filterGroup(event.getFilterGroup())
                .thumbnailKey(event.getThumbnailUrl())
                .description(event.getDescription())
                .hostContact(event.getHostContact())
                .isAdminManaged(event.isAdminManaged())
                .extraJson(event.getExtraJson())
                .build();
    }
}