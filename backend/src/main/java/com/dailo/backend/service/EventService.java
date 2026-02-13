package com.dailo.backend.service;

import com.dailo.backend.dto.event.*;

import com.dailo.backend.entity.Event;
import com.dailo.backend.domain.enums.EventStatus;
import com.dailo.backend.domain.enums.EventCategory;
import com.dailo.backend.repository.EventRepository;
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

    /** 지도/검색: 키워드(행사명·장소·설명)로 행사 검색, 위경도 있는 것만 반환 (지도 검색 결과용) */
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
        return page.getContent().stream()
                .filter(e -> e.getLatitude() != null && e.getLongitude() != null)
                .map(EventMapResponse::from)
                .collect(Collectors.toList());
    }

    // 리스트 조회 (검색/필터/정렬 통합)
    public Page<EventListResponse> getEventList(EventListRequest request) {

        // 동적 정렬: 인기/추천 키워드 매핑 (trending=7일 조회수, views=30일 조회수, popular=좋아요)
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

        // Pageable 생성
        Pageable pageable = PageRequest.of(request.page() - 1, request.size(), sort);

        // 날짜 변환
        LocalDateTime searchStart = (request.startAt() != null) ? request.startAt().atStartOfDay() : null;
        LocalDateTime searchEnd = (request.endAt() != null) ? request.endAt().atTime(LocalTime.MAX) : null;

        // 레포지토리 호출
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
                        .category(event.getCategories().isEmpty() ? EventCategory.ETC : event.getCategories().get(0))
                        .filterGroup(event.getFilterGroup())
                        .startAt(event.getStartAt())
                        .endAt(event.getEndAt() != null ? event.getEndAt() : event.getStartAt())
                        .isBookmarked(scrappedEventIds.contains(event.getId()))
                        .build())
                .collect(Collectors.toList());
    }

}