package com.dailo.backend.controller;

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
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
@Tag(name = "Event API", description = "이벤트 조회 (지도/리스트/상세) 관련 API")
public class EventController {

    private final EventService eventService;

    /**
     * 1. 지도 마커 조회 (Bounds 기반)
     * [GET] /api/events/map?swLat=...&neLat=...&swLng=...&neLng=...
     * 현재 보고 있는 지도 화면(좌표 범위) 내의 행사 마커를 조회합니다.
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
     * 2. 이벤트 리스트 조회 (페이징 + 필터링)
     * [GET] /api/events?page=1&size=20&categories=FESTIVAL
     */
    @Operation(summary = "이벤트 리스트 조회", description = "필터 조건(카테고리, 날짜 등)에 맞는 이벤트 목록을 페이징하여 조회합니다.")
    @GetMapping
    public ResponseEntity<Page<EventListResponse>> getEventList(
            @ModelAttribute EventListRequest request
    ) {
        // Service 내부에서 PageRequest 생성 및 로직 처리한다고 가정하고 호출
        Page<EventListResponse> response = eventService.getEventList(request);
        return ResponseEntity.ok(response);
    }

    /**
     * 3. 이벤트 상세 조회
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