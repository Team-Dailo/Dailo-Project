package com.dailo.backend.controller;

import com.dailo.backend.dto.AdminEventCreateRequest;
import com.dailo.backend.dto.AdminEventResponse;
import com.dailo.backend.dto.admin.EventActivityStatsDto;
import com.dailo.backend.repository.EventRepository;
import com.dailo.backend.service.AdminEventService;
import com.dailo.backend.service.FestivalAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 축제 관리자 전용 API
 * FESTIVAL_ADMIN 또는 ADMIN 권한 필요
 */
@RestController
@RequestMapping("/api/festival-admin")
@RequiredArgsConstructor
public class FestivalAdminController {

    private final FestivalAdminService festivalAdminService;
    private final AdminEventService adminEventService;
    private final EventRepository eventRepository;

    /**
     * 내가 관리하는 축제 목록 조회
     */
    @GetMapping("/my-events")
    public ResponseEntity<List<AdminEventResponse>> getMyManagedEvents(
            @RequestHeader("X-User-Id") Long userId) {

        List<Long> eventIds = festivalAdminService.getManagedEventIds(userId);

        List<AdminEventResponse> events = eventIds.stream()
                .map(adminEventService::getEventDetail)
                .collect(Collectors.toList());

        return ResponseEntity.ok(events);
    }

    /**
     * 축제 상세 조회 (권한 확인)
     */
    @GetMapping("/events/{eventId}")
    public ResponseEntity<AdminEventResponse> getEventDetail(
            @PathVariable Long eventId,
            @RequestHeader("X-User-Id") Long userId) {

        festivalAdminService.checkManagePermission(userId, eventId);

        AdminEventResponse response = adminEventService.getEventDetail(eventId);
        return ResponseEntity.ok(response);
    }

    /**
     * 축제 수정 (권한 확인)
     */
    @PutMapping("/events/{eventId}")
    public ResponseEntity<Long> updateEvent(
            @PathVariable Long eventId,
            @RequestBody @Valid AdminEventCreateRequest request,
            @RequestHeader("X-User-Id") Long userId) {

        festivalAdminService.checkManagePermission(userId, eventId);

        Long updatedId = adminEventService.updateEvent(eventId, request);
        return ResponseEntity.ok(updatedId);
    }

    /**
     * 시간대별 사용자 활동 통계 조회
     */
    @GetMapping("/events/{eventId}/activity-stats")
    public ResponseEntity<EventActivityStatsDto> getEventActivityStats(
            @PathVariable Long eventId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestHeader("X-User-Id") Long userId) {

        festivalAdminService.checkManagePermission(userId, eventId);

        EventActivityStatsDto stats = festivalAdminService.getEventActivityStats(eventId, date);
        return ResponseEntity.ok(stats);
    }
}
