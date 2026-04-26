package com.dailo.backend.dto.event;

import com.dailo.backend.entity.Event;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventMapResponse {
    private Long id;
    private String title;
    private Double latitude;
    private Double longitude;
    private String category;      // 대표 카테고리 1개 (핀 색상 구분용)
    private String thumbnailUrl;
    private String status;        // 행사 상태 (ACTIVE 등)
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private String placeName;
    private String placeAddress;
    /** 지역명 (서울, 충북 충주 등) → 현재 위치 지역 필터용 */
    private String regionName;
    /** 규모/달력 필터 (CHUNGJU_CITY, UNIVERSITY, COLLEGE, CLUB 등) → 마커 색상용 */
    private String filterGroup;
    /** 좋아요 수 (인기순 목록 표시용) */
    private Integer likeCount;

    public static EventMapResponse from(Event event) {
        return from(event, event.getLikeCount() != null ? event.getLikeCount().longValue() : 0L);
    }

    /** 실제 좋아요 수(event_like 집계)를 넣을 때 사용 (지도/검색 응답) */
    public static EventMapResponse from(Event event, long likeCount) {
        return from(event, likeCount, event.getThumbnailUrl());
    }

    public static EventMapResponse from(Event event, long likeCount, String resolvedThumbUrl) {
        String mainCategory = "ETC";
        if (event.getCategories() != null && !event.getCategories().isEmpty()) {
            mainCategory = event.getCategories().get(0).name();
        }

        return EventMapResponse.builder()
                .id(event.getId())
                .title(event.getTitle())
                .latitude(event.getLatitude())
                .longitude(event.getLongitude())
                .category(mainCategory)
                .thumbnailUrl(resolvedThumbUrl)
                .status(event.getStatus().name())
                .startAt(event.getStartAt())
                .endAt(event.getEndAt())
                .placeName(event.getPlaceName())
                .placeAddress(event.getPlaceAddress())
                .regionName(event.getRegionName())
                .filterGroup(event.getFilterGroup())
                .likeCount((int) Math.min(likeCount, Integer.MAX_VALUE))
                .build();
    }
}