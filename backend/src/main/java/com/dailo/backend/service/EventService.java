package com.dailo.backend.service;

import com.dailo.backend.dto.event.*;
import com.dailo.backend.entity.Event;
import com.dailo.backend.domain.enums.EventStatus;
import com.dailo.backend.domain.enums.EventCategory;
import com.dailo.backend.repository.EventRepository;
import com.dailo.backend.repository.ScrapRepository;
import com.dailo.backend.repository.MemberRepository;
import com.dailo.backend.entity.Member;
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
    private final MemberRepository memberRepository;
    private final NotificationService notificationService;

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

    // 리스트 조회 (검색/필터/정렬 통합)
    public Page<EventListResponse> getEventList(EventListRequest request) {
        Sort sort = Sort.by(Sort.Direction.ASC, "startAt");

        if (request.sort() != null && !request.sort().isBlank()) {
            String[] sortParams = request.sort().split(",");
            String property = sortParams[0];
            Sort.Direction direction = (sortParams.length > 1 && sortParams[1].equalsIgnoreCase("desc"))
                    ? Sort.Direction.DESC
                    : Sort.Direction.ASC;
            sort = Sort.by(direction, property);
        }

        Pageable pageable = PageRequest.of(request.page() - 1, request.size(), sort);

        LocalDateTime searchStart = (request.startAt() != null) ? request.startAt().atStartOfDay() : null;
        LocalDateTime searchEnd = (request.endAt() != null) ? request.endAt().atTime(LocalTime.MAX) : null;

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
                event.getPlaceName(),
                event.getCategories() != null ? event.getCategories() : List.of()
        );
    }

    // 캘린더 월별 조회
    public List<EventCalendarResponse> getCalendarEvents(int year, int month, Long memberId) {
        LocalDateTime startOfMonth = LocalDateTime.of(year, month, 1, 0, 0);
        LocalDateTime endOfMonth = startOfMonth.plusMonths(1);

        List<Event> events = eventRepository.findEventsForCalendar(startOfMonth, endOfMonth);

        Set<Long> scrappedEventIds = (memberId != null)
                ? scrapRepository.findScrappedEventIds(memberId)
                : Collections.emptySet();

        return events.stream()
                .map(event -> EventCalendarResponse.builder()
                        .id(event.getId())
                        .title(event.getTitle())
                        .category(event.getCategories().isEmpty() ? EventCategory.ETC : event.getCategories().get(0))
                        .filterGroup(event.getFilterGroup())
                        .startAt(event.getStartAt())
                        .endAt(event.getEndAt() != null ? event.getEndAt() : event.getStartAt())
                        .isBookmarked(scrappedEventIds.contains(event.getId()))
                        .build())
                .collect(Collectors.toList());
    }


    public List<EventMapResponse> searchEventsByKeyword(String keyword, int size) {
        Pageable pageable = PageRequest.of(0, size, Sort.by(Sort.Direction.DESC, "startAt"));

        Page<Event> events = eventRepository.searchEvents(
                EventStatus.ACTIVE,
                null, null, null, null,
                keyword,
                pageable
        );

        return events.stream()
                .map(EventMapResponse::from)
                .collect(Collectors.toList());
    }

    // 행사 등록 및 알림 발송
    @Transactional
    public Long createEvent(EventCreateRequest request) {
        Event event = eventRepository.save(request.toEntity());

        List<Member> targetMembers = memberRepository.findAll();

        String title = "🎊 새로운 행사가 등록되었어요!";
        String body = String.format("[%s] 행사가 지금 막 등록되었습니다. 지금 확인해보세요!", event.getTitle());

        for (Member member : targetMembers) {
            notificationService.sendPushNotification(member, title, body);
        }

        return event.getId();
    }
}