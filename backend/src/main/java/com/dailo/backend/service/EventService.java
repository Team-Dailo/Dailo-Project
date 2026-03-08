package com.dailo.backend.service;

import com.dailo.backend.dto.event.*;

import com.dailo.backend.entity.Event;
import com.dailo.backend.entity.Member;
import com.dailo.backend.domain.enums.EventStatus;
import com.dailo.backend.domain.enums.EventCategory;
import com.dailo.backend.repository.EventLikeRepository;
import com.dailo.backend.repository.EventRepository;
import com.dailo.backend.repository.MemberRepository;
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
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EventService {

    private final EventRepository eventRepository;
    private final EventLikeRepository eventLikeRepository;
    private final ScrapRepository scrapRepository;
    private final MemberRepository memberRepository; //

    // 상세 조회 (memberId 있으면 스크랩 여부 포함)
    public EventDetailResponse getEventDetail(Long eventId, String email) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이벤트입니다. id=" + eventId));

        boolean isBookmarked = false;
        if (email != null) {
            Member member = memberRepository.findByEmail(email).orElse(null);
            if (member != null) {
                isBookmarked = scrapRepository.findByMemberIdAndEventId(member.getId(), eventId).isPresent();
            }
        }
        return EventDetailResponse.from(event, isBookmarked);
    }

    // 지도 마커 조회 (실제 event_like 집계로 좋아요 수 반환)
    public List<EventMapResponse> getEventsInMap(Double swLat, Double neLat, Double swLng, Double neLng) {
        List<Event> events = eventRepository.findEventsInBounds(swLat, neLat, swLng, neLng, EventStatus.ACTIVE);
        if (events.isEmpty()) return Collections.emptyList();
        List<Long> ids = events.stream().map(Event::getId).collect(Collectors.toList());
        Map<Long, Long> likeCounts = toLikeCountMap(eventLikeRepository.countByEventIds(ids));
        return events.stream()
                .map(e -> EventMapResponse.from(e, likeCounts.getOrDefault(e.getId(), 0L)))
                .collect(Collectors.toList());
    }

    /** 지도/검색: 키워드(행사명·장소·설명)로 행사 검색, 위경도 있는 것만 반환 */
    public List<EventMapResponse> searchEventsByKeyword(String keyword, int size) {
        if (keyword == null || keyword.isBlank()) {
            return Collections.emptyList();
        }
        Pageable pageable = PageRequest.of(0, Math.min(size, 100), Sort.by(Sort.Direction.ASC, "startAt"));
        Page<Event> page = eventRepository.searchEvents(
                EventStatus.ACTIVE,
                null,
                null,
                null,
                null,
                keyword.trim(),
                pageable
        );
        List<Event> events = page.getContent().stream()
                .filter(e -> e.getLatitude() != null && e.getLongitude() != null)
                .collect(Collectors.toList());
        if (events.isEmpty()) return Collections.emptyList();
        List<Long> ids = events.stream().map(Event::getId).collect(Collectors.toList());
        Map<Long, Long> likeCounts = toLikeCountMap(eventLikeRepository.countByEventIds(ids));
        return events.stream()
                .map(e -> EventMapResponse.from(e, likeCounts.getOrDefault(e.getId(), 0L)))
                .collect(Collectors.toList());
    }

    private static Map<Long, Long> toLikeCountMap(List<Object[]> rows) {
        return rows.stream()
                .collect(Collectors.toMap(
                        row -> ((Number) row[0]).longValue(),
                        row -> ((Number) row[1]).longValue()
                ));
    }

    // 리스트 조회 (검색/필터/정렬 통합)
    public Page<EventListResponse> getEventList(EventListRequest request) {

        // 동적 정렬: 인기/추천 키워드 매핑
        String sortParam = request.sort() != null ? request.sort().trim() : "";
        if ("trending".equalsIgnoreCase(sortParam)) {
            sortParam = "viewCount7d,desc";
        } else if ("views".equalsIgnoreCase(sortParam)) {
            sortParam = "viewCount30d,desc";
        } else if ("popular".equalsIgnoreCase(sortParam)) {
            sortParam = "likeCount,desc";
        }

        Sort sort = Sort.by(Sort.Direction.ASC, "startAt"); // 기본값
        if (!sortParam.isBlank()) {
            String[] parts = sortParam.split(",");
            String property = parts[0].trim();
            Sort.Direction direction = (parts.length > 1 && "desc".equalsIgnoreCase(parts[1].trim()))
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
                event.getCategories() != null ? event.getCategories() : List.of(),
                event.getRegionName()
        );
    }

    // 캘린더 월별 조회
    public List<EventCalendarResponse> getCalendarEvents(int year, int month, String email) {
        LocalDateTime startOfMonth = LocalDateTime.of(year, month, 1, 0, 0);
        LocalDateTime endOfMonth = startOfMonth.plusMonths(1);

        List<Event> events = eventRepository.findEventsForCalendar(startOfMonth, endOfMonth);

        // 💡 이메일로 멤버 ID를 찾아 스크랩 정보 조회
        Set<Long> scrappedEventIds = Collections.emptySet();
        if (email != null) {
            Member member = memberRepository.findByEmail(email).orElse(null);
            if (member != null) {
                scrappedEventIds = scrapRepository.findScrappedEventIds(member.getId());
            }
        }

        final Set<Long> finalScrappedEventIds = scrappedEventIds; // 람다 안에서 쓰기 위해 final (혹은 effectively final) 처리

        return events.stream()
                .map(event -> EventCalendarResponse.builder()
                        .id(event.getId())
                        .title(event.getTitle())
                        .category(event.getCategories().isEmpty() ? EventCategory.ETC : event.getCategories().get(0))
                        .filterGroup(event.getFilterGroup())
                        .startAt(event.getStartAt())
                        .endAt(event.getEndAt() != null ? event.getEndAt() : event.getStartAt())
                        .isBookmarked(finalScrappedEventIds.contains(event.getId()))
                        .build())
                .collect(Collectors.toList());
    }
}