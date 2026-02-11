package com.dailo.backend.dto.event;

import com.dailo.backend.entity.Event;
import com.dailo.backend.domain.enums.EventCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
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
    private List<String> posterUrls;     // 포스터 이미지 리스트
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

    /** 소식/타임테이블/부스 등 상세 탭 데이터 (JSON) */
    private String extraJson;

    /** 좋아요 수 */
    private Long likeCount;
    /** 현재 사용자가 좋아요 했는지 */
    private Boolean isLiked;

    public static EventDetailResponse from(Event event) {
        return from(event, null);
    }

    public static EventDetailResponse from(Event event, Boolean isLiked) {

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

        return EventDetailResponse.builder()
                .id(event.getId())
                .title(event.getTitle())
                .posterUrls(event.getPosterUrls())
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
                .likeCount(event.getLikeCount() != null ? event.getLikeCount().longValue() : 0L)
                .isLiked(isLiked != null ? isLiked : false)
                .build();
    }
}