package com.dailo.backend.controller;

import com.dailo.backend.dto.event.EventCalendarResponse; // [추가]
import com.dailo.backend.dto.event.EventDetailResponse;
import com.dailo.backend.dto.event.EventListRequest;
import com.dailo.backend.dto.event.EventListResponse;
import com.dailo.backend.dto.event.EventMapResponse;
import com.dailo.backend.service.EventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal; // [추가] Security 사용 시
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
@Tag(name = "Event API", description = "이벤트 조회 (지도/리스트/상세/캘린더) 관련 API")
public class EventController {

    private final EventService eventService;

    /**
     * 지도 마커 조회 (Bounds 기반)
     * [GET] /api/events/map?swLat=...&neLat=...&swLng=...&neLng=...
     */
    @Operation(summary = "지도 마커 조회 (Bounds)", description = "현재 지도 화면(남서~북동 좌표) 내의 행사 마커 리스트를 반환합니다.")
    @GetMapping("/map")
    public ResponseEntity<List<EventMapResponse>> getEventsOnMap(
            @Parameter(description = "남서쪽(좌하단) 위도", required = true, example = "37.1234") @RequestParam Double swLat,
            @Parameter(description = "북동쪽(우상단) 위도", required = true, example = "37.5678") @RequestParam Double neLat,
            @Parameter(description = "남서쪽(좌하단) 경도", required = true, example = "126.1234") @RequestParam Double swLng,
            @Parameter(description = "북동쪽(우상단) 경도", required = true, example = "127.5678") @RequestParam Double neLng
    ) {
        return ResponseEntity.ok(eventService.getEventsInMap(swLat, neLat, swLng, neLng));
    }

    /**
     * 캘린더 월별 조회 (Feat/86)
     * [GET] /api/events/calendar?year=2025&month=5
     */
    @Operation(summary = "캘린더 월별 조회", description = "특정 연/월의 전체 이벤트 리스트를 조회합니다. (로그인 시 북마크 여부 포함)")
    @GetMapping("/calendar")
    public ResponseEntity<List<EventCalendarResponse>> getCalendarEvents(
            @Parameter(description = "조회할 연도", required = true, example = "2025") @RequestParam int year,
            @Parameter(description = "조회할 월", required = true, example = "5") @RequestParam int month,
            // [참고] Spring Security 설정에 따라 Principal 객체 타입(MemberDetails 등)을 맞춰주세요.
            // 일단 테스트를 위해 Object로 받거나, 비로그인 상태면 null로 처리합니다.
            @AuthenticationPrincipal Object principal
    ) {
        Long memberId = null;

        // TODO: 실제 Security 인증 객체에서 ID를 꺼내는 로직으로 교체
        // if (principal instanceof PrincipalDetails) { memberId = ((PrincipalDetails) principal).getMember().getId(); }
        // 지금은 비로그인 상태(null)로 가정

        return ResponseEntity.ok(eventService.getCalendarEvents(year, month, memberId));
    }

    /**
     * 이벤트 리스트 조회 (페이징 + 필터링)
     * [GET] /api/events?page=1&size=20&categories=FESTIVAL
     */
    @Operation(summary = "이벤트 리스트 조회", description = "필터 조건(카테고리, 날짜 등)에 맞는 이벤트 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<Page<EventListResponse>> getEventList(
            @ModelAttribute EventListRequest request
    ) {
        Page<EventListResponse> response = eventService.getEventList(request);
        return ResponseEntity.ok(response);
    }

    /**
     * 지도 검색: 키워드(행사명·장소·설명)로 행사 검색
     * [GET] /api/events/search?keyword=xxx&size=30
     */
    @Operation(summary = "지도 검색", description = "행사명·장소명·설명에 키워드가 포함된 행사 목록을 반환합니다. 위경도가 있는 행사만 포함됩니다.")
    @GetMapping("/search")
    public ResponseEntity<List<EventMapResponse>> searchEvents(
            @Parameter(description = "검색 키워드", required = true) @RequestParam String keyword,
            @Parameter(description = "최대 건수", example = "30") @RequestParam(defaultValue = "30") int size
    ) {
        return ResponseEntity.ok(eventService.searchEventsByKeyword(keyword, size));
    }

    /**
     * 이벤트 상세 조회
     * [GET] /api/events/{id}
     */
    @Operation(summary = "이벤트 상세 조회", description = "특정 이벤트의 모든 상세 정보를 조회합니다.")
    @GetMapping("/{id}")
    public ResponseEntity<EventDetailResponse> getEventDetail(
            @Parameter(description = "조회할 이벤트 ID", required = true)
            @PathVariable Long id
    ) {
        return ResponseEntity.ok(eventService.getEventDetail(id));
    }
}