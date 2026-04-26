package com.dailo.backend.dto.event;

import com.dailo.backend.entity.Event;
import com.dailo.backend.domain.enums.EventCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventDetailResponse {
    private Long id;
    private String title;
    /** 대표 썸네일(리스트·지도·상세 상단 공통) */
    @Setter private String thumbnailUrl;
    /** 상세 포스터 이미지 리스트 (0번 = 대표 썸네일) */
    @Setter private List<String> posterUrls;
    private LocalDateTime startAt;       // 시작 일시
    private LocalDateTime endAt;         // 종료 일시
    private String placeName;            // 장소명
    private String placeAddress;         // 상세 주소
    private Double latitude;             // 위도
    private Double longitude;            // 경도
    private String description;          // 상세 설명 (본문)
    private List<EventCategory> categories; // 카테고리 리스트
    private String hostContact;          // 주최측 연락처
    private String status;               // 행사 상태 (ACTIVE/DRAFT 등)

    // 네이버 지도 길찾기 URL (웹용)
    private String naverMapUrl;

    /** 소식/타임테이블/푸드트럭/축제부스 JSON (행사 상세 탭 표시용) */
    private String extraJson;

    /** 로그인한 사용자가 이 행사를 저장(스크랩)했는지 (본인 계정에서만 true) */
    private Boolean isBookmarked;

    public static EventDetailResponse from(Event event) {

        // 1. 장소명 or 제목 가져오기
        String safePlaceName;
        if (event.getPlaceName() != null && !event.getPlaceName().isEmpty()) {
            safePlaceName = event.getPlaceName();
        } else {
            safePlaceName = event.getTitle();
        }

        // 2. URL 생성 (URL 인코딩 적용)
        String generatedMapUrl = null;
        if (event.getLatitude() != null && event.getLongitude() != null) {
            try {

                String encodedPlaceName = URLEncoder.encode(safePlaceName, StandardCharsets.UTF_8);

                generatedMapUrl = String.format(
                        "https://map.naver.com/index.nhn?elng=%f&elat=%f&etext=%s&menu=route",
                        event.getLongitude(),
                        event.getLatitude(),
                        encodedPlaceName // 인코딩된 이름을 넣어야 함!
                );
            } catch (Exception e) {
                // 인코딩 실패 시 URL 생성 안 함 (혹은 로그 남기기)
                generatedMapUrl = null;
            }
        }

        // 대표 썸네일
        String thumb = event.getThumbnailUrl();

        // 포스터 리스트: 0번에 대표 썸네일을 두고, 나머지 고화질 포스터를 뒤에 이어 붙인다.
        List<String> posters = new java.util.ArrayList<>();
        if (thumb != null && !thumb.isBlank()) {
            posters.add(thumb);
        }
        if (event.getPosterUrls() != null) {
            for (String url : event.getPosterUrls()) {
                if (url != null && !url.isBlank() && !url.equals(thumb)) {
                    posters.add(url);
                }
            }
        }

        return EventDetailResponse.builder()
                .id(event.getId())
                .title(event.getTitle())
                .thumbnailUrl(thumb)
                .posterUrls(posters)
                .startAt(event.getStartAt())
                .endAt(event.getEndAt())
                .placeName(event.getPlaceName())
                .placeAddress(event.getPlaceAddress())
                .latitude(event.getLatitude())
                .longitude(event.getLongitude())
                .description(event.getDescription())
                .categories(event.getCategories())
                .hostContact(event.getHostContact())
                .status(event.getStatus().name())
                .naverMapUrl(generatedMapUrl)
                .extraJson(event.getExtraJson())
                .isBookmarked(null)
                .build();
    }

    public static EventDetailResponse from(Event event, boolean isBookmarked) {
        EventDetailResponse base = from(event);
        return EventDetailResponse.builder()
                .id(base.getId())
                .title(base.getTitle())
                .thumbnailUrl(base.getThumbnailUrl())
                .posterUrls(base.getPosterUrls())
                .startAt(base.getStartAt())
                .endAt(base.getEndAt())
                .placeName(base.getPlaceName())
                .placeAddress(base.getPlaceAddress())
                .latitude(base.getLatitude())
                .longitude(base.getLongitude())
                .description(base.getDescription())
                .categories(base.getCategories())
                .hostContact(base.getHostContact())
                .status(base.getStatus())
                .naverMapUrl(base.getNaverMapUrl())
                .extraJson(base.getExtraJson())
                .isBookmarked(isBookmarked)
                .build();
    }
}