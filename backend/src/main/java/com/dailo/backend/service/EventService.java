package com.dailo.backend.service;

import com.dailo.backend.dto.event.*;

import com.dailo.backend.entity.Event;
import com.dailo.backend.domain.enums.EventStatus;
import com.dailo.backend.domain.enums.EventCategory;
import com.dailo.backend.repository.EventRepository;
import com.dailo.backend.repository.EventLikeRepository;
import com.dailo.backend.repository.ScrapRepository;
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
import java.util.Set;
import java.util.Collections;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EventService {

    private final EventRepository eventRepository;
    private final ScrapRepository scrapRepository;
    private final EventLikeRepository eventLikeRepository;

    /** 상세 조회 (비로그인 시 isLiked=false) */
    public EventDetailResponse getEventDetail(Long eventId, Long memberId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이벤트입니다. id=" + eventId));
        Boolean isLiked = memberId != null && eventLikeRepository.existsByMemberIdAndEventId(memberId, eventId);
        return EventDetailResponse.from(event, isLiked);
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

    /** 인기순(좋아요 많은 순) 상위 행사 (홈 캐러셀용). 종료된 행사(endAt < now) 제외. */
    public List<EventListResponse> getTopEventsByLikeCount(int size) {
        Pageable pageable = PageRequest.of(0, Math.max(size * 2, 20),
                Sort.by(Sort.Direction.DESC, "likeCount").and(Sort.by(Sort.Direction.ASC, "startAt")));
        List<Event> events = eventRepository.findByStatus(EventStatus.ACTIVE, pageable);
        LocalDateTime now = LocalDateTime.now();
        List<Event> notEnded = events.stream()
                .filter(e -> e.getEndAt() == null || !e.getEndAt().isBefore(now))
                .limit(size)
                .collect(Collectors.toList());
        return notEnded.stream().map(this::convertToEventListResponse).collect(Collectors.toList());
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

    //  캘린더 월별 조회
    public List<EventCalendarResponse> getCalendarEvents(int year, int month, Long memberId) {
        // 1. 조회 범위 설정 (해당 월 1일 ~ 다음 달 1일)
        LocalDateTime startOfMonth = LocalDateTime.of(year, month, 1, 0, 0);
        LocalDateTime endOfMonth = startOfMonth.plusMonths(1);

        // 2. 기간 겹침 이벤트 조회 (Repository 메소드 필요)
        List<Event> events = eventRepository.findEventsForCalendar(startOfMonth, endOfMonth);

        // 3. 로그인 유저의 스크랩 정보 조회 (한 번에 가져와서 N+1 방지)
        // (ScrapRepository 주입 필요. 만약 없으면 Service 상단에 private final ScrapRepository scrapRepository; 추가하세요)
        Set<Long> scrappedEventIds = (memberId != null)
                ? scrapRepository.findScrappedEventIds(memberId)
                : Collections.emptySet();

        // 4. DTO 변환
        return events.stream()
                .map(event -> EventCalendarResponse.builder()
                        .id(event.getId())
                        .title(event.getTitle())
                        // 카테고리가 여러 개면 첫 번째 것을 대표 색상으로 사용 (없으면 ETC)
                        .category(event.getCategories().isEmpty() ? EventCategory.ETC : event.getCategories().get(0))
                        .startAt(event.getStartAt())
                        .endAt(event.getEndAt() != null ? event.getEndAt() : event.getStartAt())
                        .isBookmarked(scrappedEventIds.contains(event.getId()))
                        .build())
                .collect(Collectors.toList());
    }

}