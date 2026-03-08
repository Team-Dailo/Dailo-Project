package com.dailo.backend.controller;

import com.dailo.backend.dto.event.EventCalendarResponse;
import com.dailo.backend.dto.event.EventDetailResponse;
import com.dailo.backend.dto.event.EventLikeStatusDto;
import com.dailo.backend.dto.event.EventListRequest;
import com.dailo.backend.dto.event.EventListResponse;
import com.dailo.backend.dto.event.EventMapResponse;
import com.dailo.backend.service.EventLikeService;
import com.dailo.backend.service.EventService;
import com.dailo.backend.util.SecurityUtil;
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

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
@Tag(name = "Event API", description = "이벤트 조회 (지도/리스트/상세/캘린더) 관련 API")
public class EventController {

    private final EventService eventService;
    private final EventLikeService eventLikeService;

    @Operation(summary = "지도 마커 조회 (Bounds)", description = "현재 지도 화면(남서~북동 좌표) 내의 행사 마커 리스트를 반환합니다.")
    @GetMapping("/map")
    public ResponseEntity<List<EventMapResponse>> getEventsOnMap(
            @Parameter(description = "남서쪽(좌하단) 위도", required = true) @RequestParam Double swLat,
            @Parameter(description = "북동쪽(우상단) 위도", required = true) @RequestParam Double neLat,
            @Parameter(description = "남서쪽(좌하단) 경도", required = true) @RequestParam Double swLng,
            @Parameter(description = "북동쪽(우상단) 경도", required = true) @RequestParam Double neLng
    ) {
        return ResponseEntity.ok(eventService.getEventsInMap(swLat, neLat, swLng, neLng));
    }

    @Operation(summary = "캘린더 월별 조회", description = "특정 연/월의 전체 이벤트 리스트를 조회합니다. (로그인 시 북마크 여부 포함)")
    @GetMapping("/calendar")
    public ResponseEntity<List<EventCalendarResponse>> getCalendarEvents(
            @Parameter(description = "조회할 연도", required = true) @RequestParam int year,
            @Parameter(description = "조회할 월", required = true) @RequestParam int month,
            @AuthenticationPrincipal UserDetails userDetails // 💡 수정됨
    ) {
        String email = (userDetails != null) ? userDetails.getUsername() : null;
        return ResponseEntity.ok(eventService.getCalendarEvents(year, month, email));
    }

    @Operation(summary = "이벤트 리스트 조회", description = "필터 조건(카테고리, 날짜 등)에 맞는 이벤트 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<Page<EventListResponse>> getEventList(
            @ModelAttribute EventListRequest request
    ) {
        return ResponseEntity.ok(eventService.getEventList(request));
    }

    @Operation(summary = "지도 검색", description = "행사명·장소명·설명에 키워드가 포함된 행사 목록을 반환합니다. 위경도가 있는 행사만 포함됩니다.")
    @GetMapping("/search")
    public ResponseEntity<List<EventMapResponse>> searchEvents(
            @Parameter(description = "검색 키워", required = true) @RequestParam String keyword,
            @Parameter(description = "최대 건수") @RequestParam(defaultValue = "30") int size
    ) {
        return ResponseEntity.ok(eventService.searchEventsByKeyword(keyword, size));
    }

    @Operation(summary = "이벤트 상세 조회", description = "특정 이벤트의 모든 상세 정보를 조회합니다.")
    @GetMapping("/{id}")
    public ResponseEntity<EventDetailResponse> getEventDetail(
            @Parameter(description = "조회할 이벤트 ID", required = true) @PathVariable Long id
    ) {
        String email = SecurityUtil.getCurrentMemberEmail();
        return ResponseEntity.ok(eventService.getEventDetail(id, email));
    }

    @Operation(summary = "행사 좋아요 상태 조회", description = "해당 행사의 좋아요 수와, 로그인한 경우 내가 좋아요 했는지 반환합니다.")
    @GetMapping("/{id}/like")
    public ResponseEntity<EventLikeStatusDto> getEventLikeStatus(
            @Parameter(description = "행사 ID", required = true) @PathVariable Long id
    ) {
        String email = SecurityUtil.getCurrentMemberEmail();
        boolean liked = email != null && eventLikeService.isLiked(email, id);
        long likeCount = eventLikeService.getLikeCount(id);
        return ResponseEntity.ok(EventLikeStatusDto.builder().liked(liked).likeCount(likeCount).build());
    }

    @Operation(summary = "행사 좋아요 토글", description = "해당 행사에 대한 좋아요를 누르거나 해제합니다. 로그인 필요.")
    @PostMapping("/{id}/like")
    public ResponseEntity<EventLikeStatusDto> toggleEventLike(
            @Parameter(description = "행사 ID", required = true) @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        if (userDetails == null) {
            return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build();
        }

        String email = userDetails.getUsername();

        boolean liked = eventLikeService.toggleLike(email, id);
        long likeCount = eventLikeService.getLikeCount(id);
        return ResponseEntity.ok(EventLikeStatusDto.builder().liked(liked).likeCount(likeCount).build());
    }
}