package com.dailo.backend.service;

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

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true) // 최적화를 위한 읽기 전용
public class EventService {

    private final EventRepository eventRepository;

    /**
     * 이벤트 리슽 조회 (필터링 + 페이징)
     * - PUBLISHED 이벤트만 조회
     * - 카테고리 필터가 있으면 해당 카테고리만, 없으면 전체 조회
     * - 리스트용 경량 DTO(EventListReponse)로 변환하여 반환
     */

    public Page<EventListResponse> getEventList(EventListRequest request) {
        // 정렬: 시작일 빠른 순 (캘린더나 리스트 보기 좋게)
        Pageable pageable = PageRequest.of(request.page() - 1, request.size(), Sort.by(Sort.Direction.ASC, "startDateTime"));

        Page<Event> events;

        // LocalDate(2026-02-01) -> LocalDateTime(2026-02-01 00:00:00 ~ 2026-02-28 23:59:59) 변환
        LocalDateTime searchStart = (request.startDateTime() != null) ? request.startDateTime().atStartOfDay() : LocalDateTime.MIN;
        LocalDateTime searchEnd = (request.endDateTime() != null) ? request.endDateTime().atTime(LocalTime.MAX) : LocalDateTime.MAX;

        // [로직 분기] 날짜 필터 유무에 따라 다른 메서드 호출
        if (request.hasDateFilter()) {
            if (request.hasCategory()) {
                // 1. 기간 O + 카테고리 O
                events = eventRepository.findByStatusAndCategoriesAndDate(
                        EventStatus.PUBLISHED, request.categories(), searchStart, searchEnd, pageable);
            } else {
                // 2. 기간 O + 카테고리 X (캘린더 전체 조회 등)
                events = eventRepository.findByStatusAndDate(
                        EventStatus.PUBLISHED, searchStart, searchEnd, pageable);
            }
        } else {
            if (request.hasCategory()) {
                // 3. 기간 X + 카테고리 O
                events = eventRepository.findDistinctByStatusAndCategoriesIn(
                        EventStatus.PUBLISHED, request.categories(), pageable);
            } else {
                // 4. 기간 X + 카테고리 X (전체 목록)
                events = eventRepository.findAllByStatus(EventStatus.PUBLISHED, pageable);
            }
        }

        return events.map(this::convertToEventListResponse);
    }

    // 상세 조회, 변환 메서드 등은 기존과 동일...
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
                event.getStartDateTime(),
                event.getEndDateTime(),
                event.getPlaceName()
        );
    }

    private EventDetailResponse convertToEventDetailResponse(Event event) {
        return new EventDetailResponse(
                event.getId(),
                event.getTitle(),
                event.getPosterUrls(),
                event.getStartDateTime(),
                event.getEndDateTime(),
                event.getPlaceName(),
                event.getPlaceAddress(),
                event.getLatitude(),
                event.getLongitude(),
                event.getDescription(),
                event.getCategories()
        );
    }
}
