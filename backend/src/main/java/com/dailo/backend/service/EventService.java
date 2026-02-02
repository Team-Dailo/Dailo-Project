package com.dailo.backend.service;

// 패키지 경로가 변경되었으므로 import 수정
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
                .map(EventDetailResponse::from) // Entity -> DTO 변환 위임
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이벤트입니다. id=" + eventId));
    }

    // 지도 마커 조회 (Bounds)
    public List<EventMapResponse> getEventsInMap(Double swLat, Double neLat, Double swLng, Double neLng) {
        return eventRepository.findEventsInBounds(swLat, neLat, swLng, neLng, EventStatus.ACTIVE)
                .stream()
                .map(EventMapResponse::from)
                .collect(Collectors.toList());
    }

    // 리스트 조회
    public Page<EventListResponse> getEventList(EventListRequest request) {
        Pageable pageable = PageRequest.of(request.page() - 1, request.size(), Sort.by(Sort.Direction.ASC, "startAt"));

        Page<Event> events;

        LocalDateTime searchStart = (request.startDateTime() != null) ? request.startDateTime().atStartOfDay() : LocalDateTime.MIN;
        LocalDateTime searchEnd = (request.endDateTime() != null) ? request.endDateTime().atTime(LocalTime.MAX) : LocalDateTime.MAX;

        if (request.hasDateFilter()) {
            if (request.hasCategory()) {
                events = eventRepository.findByStatusAndCategoriesAndDate(
                        EventStatus.ACTIVE, request.categories(), searchStart, searchEnd, pageable);
            } else {
                events = eventRepository.findByStatusAndDate(
                        EventStatus.ACTIVE, searchStart, searchEnd, pageable);
            }
        } else {
            if (request.hasCategory()) {
                events = eventRepository.findDistinctByStatusAndCategoriesIn(
                        EventStatus.ACTIVE, request.categories(), pageable);
            } else {
                events = eventRepository.findAllByStatus(EventStatus.ACTIVE, pageable);
            }
        }

        return events.map(this::convertToEventListResponse);
    }

    // 리스트 변환용 메서드
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