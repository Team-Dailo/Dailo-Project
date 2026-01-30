package com.dailo.backend.controller;

import com.dailo.backend.dto.EventDetailResponse;
import com.dailo.backend.dto.EventListRequest;
import com.dailo.backend.dto.EventListResponse;
import com.dailo.backend.service.EventService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor // final 필드 생성자 자동 생성 (DI)
public class EventController {

    private final EventService eventService;

    // ==========================================
    // [Issue 1] 이벤트 조회 API 구현 (Service 연결)
    // ==========================================

    /**
     * 1. 이벤트 리스트 조회 (페이징 + 필터링)
     * [GET] /api/events?page=1&size=20&categories=FESTIVAL
     */
    @GetMapping
    public ResponseEntity<Page<EventListResponse>> getEventList(
            @ModelAttribute EventListRequest request
    ) {
        // DTO의 page, size를 이용하여 Pageable 객체 생성
        Pageable pageable = PageRequest.of(request.page() - 1, request.size());

        Page<EventListResponse> response = eventService.getEventList(request);
        return ResponseEntity.ok(response);
    }

    /**
     * 2. 이벤트 상세 조회
     * [GET] /api/events/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<EventDetailResponse> getEventDetail(@PathVariable Long id) {
        EventDetailResponse response = eventService.getEventDetail(id);
        return ResponseEntity.ok(response);
    }

    // ==========================================
    // [TODO] 생성/수정/삭제 API 리팩토링 필요
    // Entity 구조가 변경(위치 분리, 카테고리 리스트 등)되어 기존 코드는 동작하지 않습니다.
    // 추후 '이벤트 등록/수정 API' 구현 시점에 맞춰 재작성해야 합니다.
    // ==========================================

    /*
    @PostMapping
    public ResponseEntity<Event> createEvent(@RequestBody Event event) {
        // TODO: DTO를 통해 입력받고 Service에서 Entity로 변환하여 저장하도록 수정 필요
        return ResponseEntity.ok(eventRepository.save(event));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Event> updateEvent(@PathVariable Long id, @RequestBody Event eventDetails) {
        // TODO: 변경된 Entity 필드(placeName, latitude, categories 등)에 맞춰 수정 로직 변경 필요
        // 기존 코드(setLocation 등)는 필드가 없어져서 컴파일 에러 발생함
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id) {
        // TODO: Service를 통해 삭제하도록 수정 필요
        return ResponseEntity.ok().build();
    }
    */
}