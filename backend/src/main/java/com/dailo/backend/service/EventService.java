package com.dailo.backend.service;

import com.dailo.backend.dto.EventDetailResponse;
import com.dailo.backend.dto.EventListRequest;
import com.dailo.backend.dto.EventListResponse;
import com.dailo.backend.dto.EventMapResponse;

import com.dailo.backend.entity.Event;
import com.dailo.backend.domain.enums.EventStatus;
import com.dailo.backend.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EventService {

    private final EventRepository eventRepository;

    // 상세 조회

    public EventDetailResponse getEventDetail(Long eventId) {
        return eventRepository.findById(eventId)
                .map(EventDetailResponse::from)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이벤트입니다. id=" + eventId));
    }

    // 지도 마커 조회

    public List<EventMapResponse> getEventsInMap(Double swLat, Double neLat, Double swLng, Double neLng) {
        return eventRepository.findEventsInBounds(swLat, neLat, swLng, neLng, EventStatus.ACTIVE)
                .stream()
                .map(EventMapResponse::from)
                .collect(Collectors.toList());
    }

    // 리스트 조회 (검색/필터 통합)

    public Page<EventListResponse> getEventList(EventListRequest request) {
        // startAt 오름차순
        Pageable pageable = PageRequest.of(request.page() - 1, request.size(), Sort.by(Sort.Direction.ASC, "startAt"));

        LocalDateTime searchStart = (request.startAt() != null) ? request.startAt().atStartOfDay() : null;
        LocalDateTime searchEnd = (request.endAt() != null) ? request.endAt().atTime(LocalTime.MAX) : null;

        // 통합 검색 쿼리 실행
        Page<Event> events = eventRepository.searchEvents(
                EventStatus.ACTIVE,
                searchStart,
                searchEnd,
                request.categories(),
                request.region(),
                request.keyword(),
                pageable
        );

        return events.map(this::convertToEventListResponse);
    }

    private EventListResponse convertToEventListResponse(Event event) {
        return new EventListResponse(
                event.getId(),
                event.getTitle(),
                event.getThumbnailUrl(),
                event.getStartAt(),
                event.getEndAt(),
                event.getPlaceName()
        );
    }
}