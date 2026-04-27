package com.dailo.backend.dto;

import com.dailo.backend.domain.enums.EventCategory;
import com.dailo.backend.domain.enums.EventStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class AdminEventCreateRequest {

    @NotBlank(message = "행사 제목은 필수입니다.")
    private String title;

    private String placeName;

    private String placeAddress; // 상세 주소

    private String regionName;   // 지역명 (서울, 경기 등)

    @NotNull(message = "위도는 필수입니다.")
    private Double latitude;

    @NotNull(message = "경도는 필수입니다.")
    private Double longitude;

    @NotNull(message = "시작 시간은 필수입니다.")
    private LocalDateTime startAt;

    @NotNull(message = "종료 시간은 필수입니다.")
    private LocalDateTime endAt;

    @NotEmpty(message = "카테고리는 최소 1개 이상 선택해야 합니다.")
    private List<EventCategory> categories;

    private EventStatus status; // DRAFT, ACTIVE 등 (안 보내면 기본값 처리 예정)

    /** 규모/달력 필터 (CHUNGJU_CITY, UNIVERSITY, COLLEGE, CLUB 등) → 지도 마커 색상 */
    private String filterGroup;

    private String thumbnailUrl;
    private List<String> posterUrls;
    private String description;
    private String hostContact;

    /** 소식/타임테이블/푸드트럭/축제부스 JSON (행사 상세 탭 표시용) */
    private String extraJson;

    /** 축제 구역 다각형 JSON ([{"lat":36.99,"lng":127.92},...]) - null이면 반경 200m 원형 */
    private String zonePolygon;
}