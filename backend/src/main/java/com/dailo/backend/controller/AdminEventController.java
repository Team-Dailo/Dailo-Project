package com.dailo.backend.controller;

import com.dailo.backend.dto.AdminEventCreateRequest;
import com.dailo.backend.dto.AdminEventResponse;
import com.dailo.backend.service.AdminEventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/events") // 관리자 전용 경로
@RequiredArgsConstructor
public class AdminEventController {

    private final AdminEventService adminEventService;

    // 행사 생성 (POST)
    @PostMapping
    public ResponseEntity<Long> createEvent(@RequestBody @Valid AdminEventCreateRequest request) {
        Long eventId = adminEventService.createEvent(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(eventId);
    }

    // 행사 수정 (PUT)
    @PutMapping("/{eventId}")
    public ResponseEntity<Long> updateEvent(
            @PathVariable Long eventId,
            @RequestBody @Valid AdminEventCreateRequest request) {
        Long updatedId = adminEventService.updateEvent(eventId, request);
        return ResponseEntity.ok(updatedId);
    }

    // 행사 삭제 (DELETE)
    @DeleteMapping("/{eventId}")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long eventId) {
        adminEventService.deleteEvent(eventId);
        return ResponseEntity.noContent().build(); // 204 No Content
    }

    // 행사 상세 조회 (GET)
    @GetMapping("/{eventId}")
    public ResponseEntity<AdminEventResponse> getEventDetail(@PathVariable Long eventId) {
        AdminEventResponse response = adminEventService.getEventDetail(eventId);
        return ResponseEntity.ok(response);
    }

    // 행사 목록 조회 (GET) - 페이징 처리
    // /api/admin/events?page=0&size=10&sort=id,desc
    @GetMapping
    public ResponseEntity<Page<AdminEventResponse>> getEventList(
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<AdminEventResponse> response = adminEventService.getEventList(pageable);
        return ResponseEntity.ok(response);
    }
}