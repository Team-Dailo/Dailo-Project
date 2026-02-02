package com.dailo.backend.service;

import com.dailo.backend.dto.EventMapResponse;
import com.dailo.backend.entity.Event;
import com.dailo.backend.domain.enums.EventStatus;
import com.dailo.backend.repository.EventRepository;
import com.dailo.backend.dto.EventDetailResponse;
import com.dailo.backend.dto.EventListRequest;
import com.dailo.backend.dto.EventListResponse;
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
@Transactional(readOnly = true) // 최적화를 위한 읽기 전용
public class EventService {

    private final EventRepository eventRepository;

    /**
     * 이벤트 리스트 조회 (필터링 + 페이징)
     * - ACTIVE (진행 중) 이벤트만 조회
     * - 카테고리 필터가 있으면 해당 카테고리만, 없으면 전체 조회
     */
    public Page<EventListResponse> getEventList(EventListRequest request) {
        Pageable pageable = PageRequest.of(request.page() - 1, request.size(), Sort.by(Sort.Direction.ASC, "startAt"));

        Page<Event> events;


        LocalDateTime searchStart = (request.startDateTime() != null) ? request.startDateTime().atStartOfDay() : LocalDateTime.MIN;
        LocalDateTime searchEnd = (request.endDateTime() != null) ? request.endDateTime().atTime(LocalTime.MAX) : LocalDateTime.MAX;

        // 날짜 필터 유무에 따라 다른 메서드 호출
        if (request.hasDateFilter()) {
            if (request.hasCategory()) {
                // 기간 O + 카테고리 O
                events = eventRepository.findByStatusAndCategoriesAndDate(
                        EventStatus.ACTIVE, request.categories(), searchStart, searchEnd, pageable);
            } else {
                // 기간 O + 카테고리 X
                events = eventRepository.findByStatusAndDate(
                        EventStatus.ACTIVE, searchStart, searchEnd, pageable);
            }
        } else {
            if (request.hasCategory()) {
                // 기간 X + 카테고리 O
                events = eventRepository.findDistinctByStatusAndCategoriesIn(
                        EventStatus.ACTIVE, request.categories(), pageable);
            } else {
                // 기간 X + 카테고리 X (전체 목록)
                events = eventRepository.findAllByStatus(EventStatus.ACTIVE, pageable);
            }
        }

        return events.map(this::convertToEventListResponse);
    }

    // 상세 조회
    public EventDetailResponse getEventDetail(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이벤트입니다. id=" + eventId));
        return convertToEventDetailResponse(event);
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

    private EventDetailResponse convertToEventDetailResponse(Event event) {
        return new EventDetailResponse(
                event.getId(),
                event.getTitle(),
                event.getPosterUrls(),
                event.getStartAt(),
                event.getEndAt(),
                event.getPlaceName(),
                event.getPlaceAddress(),
                event.getLatitude(),
                event.getLongitude(),
                event.getDescription(),
                event.getCategories()
        );
    }

    // 지도 마커 조회
    // 현재 지도 화면 안에 포함되면서, ACTIVE 상태 행사만 반환
    @Transactional(readOnly = true)
    public List<EventMapResponse> getEventsInMap(Double swLat, Double neLat, Double swLng, Double neLng) {
        return eventRepository.findEventsInBounds(swLat, neLat, swLng, neLng, EventStatus.ACTIVE)
                .stream()
                .map(EventMapResponse::from)
                .collect(Collectors.toList());
    }
}