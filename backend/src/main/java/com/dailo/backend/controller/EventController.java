package com.dailo.backend.controller;

import com.dailo.backend.dto.event.EventCalendarResponse;
import com.dailo.backend.dto.event.EventDetailResponse;
import com.dailo.backend.dto.event.EventListRequest;
import com.dailo.backend.dto.event.EventListResponse;
import com.dailo.backend.dto.event.EventMapResponse;
import com.dailo.backend.service.EventLikeService;
import com.dailo.backend.service.EventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
@Tag(name = "Event API", description = "이벤트 조회 (지도/리스트/상세/캘린더) 관련 API")
public class EventController {

    private final EventService eventService;
    private final EventLikeService eventLikeService;

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
     * 이벤트 상세 조회
     * [GET] /api/events/{id}
     * 로그인 시 isLiked 포함.
     */
    @Operation(summary = "이벤트 상세 조회", description = "특정 이벤트의 모든 상세 정보를 조회합니다.")
    @GetMapping("/{id}")
    public ResponseEntity<EventDetailResponse> getEventDetail(
            @Parameter(description = "조회할 이벤트 ID", required = true) @PathVariable Long id,
            @Parameter(hidden = true) @AuthenticationPrincipal UserDetails userDetails
    ) {
        Long memberId = (userDetails != null && userDetails.getUsername() != null)
                ? Long.parseLong(userDetails.getUsername())
                : null;
        return ResponseEntity.ok(eventService.getEventDetail(id, memberId));
    }

    /**
     * 인기순(좋아요 많은 순) 행사 목록 (홈 캐러셀용)
     * [GET] /api/events/popular?size=3
     */
    @Operation(summary = "인기 행사 (좋아요 순)", description = "좋아요가 많은 순으로 행사 목록을 반환합니다.")
    @GetMapping("/popular")
    public ResponseEntity<List<EventListResponse>> getPopularEvents(
            @Parameter(description = "조회 개수", example = "3") @RequestParam(defaultValue = "3") int size
    ) {
        return ResponseEntity.ok(eventService.getTopEventsByLikeCount(Math.min(size, 20)));
    }

    /**
     * 좋아요 토글 (로그인 필요)
     * [POST] /api/events/{eventId}/like
     */
    @Operation(summary = "좋아요 토글", description = "행사에 좋아요를 누르거나 해제합니다.")
    @PostMapping("/{eventId}/like")
    public ResponseEntity<Map<String, Object>> toggleLike(
            @Parameter(hidden = true) @AuthenticationPrincipal UserDetails userDetails,
            @Parameter(description = "행사 ID", required = true) @PathVariable Long eventId
    ) {
        Long memberId = Long.parseLong(userDetails.getUsername());
        boolean liked = eventLikeService.toggleLike(memberId, eventId);
        long likeCount = eventService.getEventDetail(eventId, memberId).getLikeCount();
        return ResponseEntity.ok(Map.of("liked", liked, "likeCount", likeCount));
    }
}