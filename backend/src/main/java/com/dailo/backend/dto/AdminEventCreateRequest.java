package com.dailo.backend.dto;

import com.dailo.backend.domain.enums.EventCategory;
import com.dailo.backend.domain.enums.EventFilterGroup;
import com.dailo.backend.domain.enums.EventScale;
import com.dailo.backend.domain.enums.EventStatus;
import com.fasterxml.jackson.annotation.JsonFormat;
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
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime startAt;

    @NotNull(message = "종료 시간은 필수입니다.")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime endAt;

    @NotEmpty(message = "카테고리는 최소 1개 이상 선택해야 합니다.")
    private List<EventCategory> categories;

    private EventScale scale; // 소규모, 중규모, 대규모 (안 보내면 null 허용)

    private EventFilterGroup filterGroup; // 달력 필터: 충주시/대학교/총학생회/단과대/동아리 (안 보내면 null)

    private EventStatus status; // DRAFT, ACTIVE 등 (안 보내면 기본값 처리 예정)

    private String thumbnailUrl;
    private List<String> posterUrls;
    private String description;
    private String hostContact;
    /** 소식/타임테이블/부스 등 상세 탭 데이터 (JSON) */
    private String extraJson;
}