package com.dailo.backend.service;

import com.dailo.backend.entity.Event;
import com.dailo.backend.entity.EventHistory;
import com.dailo.backend.domain.enums.EventStatus;
import com.dailo.backend.dto.AdminEventCreateRequest;
import com.dailo.backend.dto.AdminEventResponse;
import com.dailo.backend.dto.admin.AdminEventLikeCountDto;
import com.dailo.backend.dto.admin.AdminEventViewCountDto;
import com.dailo.backend.repository.ClickLogRepository;
import com.dailo.backend.repository.EventRepository;
import com.dailo.backend.repository.EventHistoryRepository;
import com.dailo.backend.repository.EventLikeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true) // 기본적으로 조회 모드
public class AdminEventService {

    private final EventRepository eventRepository;
    private final EventHistoryRepository eventHistoryRepository;
    private final EventLikeRepository eventLikeRepository;
    private final ClickLogRepository clickLogRepository;
    private final S3UploadService s3UploadService;

    // 행사 생성
    @Transactional // 쓰기 모드
    public Long createEvent(AdminEventCreateRequest request) {
        // 날짜 검증: 시작일이 종료일보다 늦으면 안 됨
        validateDate(request);

        Event event = Event.builder()
                .title(request.getTitle())
                .placeName(request.getPlaceName())
                .placeAddress(request.getPlaceAddress())
                .regionName(request.getRegionName())
                .filterGroup(request.getFilterGroup())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .startAt(request.getStartAt())
                .endAt(request.getEndAt())
                .categories(request.getCategories())
                .status(request.getStatus() != null ? request.getStatus() : EventStatus.DRAFT)
                .thumbnailUrl(request.getThumbnailUrl())
                .posterUrls(request.getPosterUrls())
                .description(request.getDescription())
                .hostContact(request.getHostContact())
                .extraJson(request.getExtraJson())
                .zonePolygon(request.getZonePolygon())
                .isAdminManaged(true)
                .build();

        return eventRepository.save(event).getId();
    }

    // 행사 수정
    @Transactional
    public Long updateEvent(Long eventId, AdminEventCreateRequest request) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("해당 행사를 찾을 수 없습니다. id=" + eventId));

        // 날짜 검증
        validateDate(request);

        // 수정하기 전 데이터를 History에 기록
        EventHistory history = EventHistory.builder()
                .event(event)
                .title(event.getTitle())
                .status(event.getStatus())
                .startAt(event.getStartAt())
                .endAt(event.getEndAt())
                .build();

        eventHistoryRepository.save(history);

        // 데이터 업데이트 (Entity의 updateEvent 메서드 호출)
        event.updateEvent(
                request.getTitle(),
                request.getPlaceName(),
                request.getPlaceAddress(),
                request.getRegionName(),
                request.getLatitude(),
                request.getLongitude(),
                request.getStartAt(),
                request.getEndAt(),
                request.getCategories(),
                request.getStatus(),
                request.getThumbnailUrl(),
                request.getPosterUrls(),
                request.getDescription(),
                request.getHostContact(),
                request.getFilterGroup(),
                request.getZonePolygon()
        );
        if (request.getExtraJson() != null) {
            event.setExtraJson(request.getExtraJson());
        }
        return eventRepository.save(event).getId();
    }

    // 행사 삭제
    @Transactional
    public void deleteEvent(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("해당 행사를 찾을 수 없습니다. id=" + eventId));

        eventRepository.delete(event); // @SQLDelete 설정 덕분에 실제 삭제 대신 deletedAt이 업데이트됨
    }

    // 행사 상세 조회
    public AdminEventResponse getEventDetail(Long eventId) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new IllegalArgumentException("해당 행사를 찾을 수 없습니다. id=" + eventId));

        return resolveThumb(AdminEventResponse.from(event));
    }

    // 행사 목록 조회 (페이징, 키워드 없으면 전체)
    public Page<AdminEventResponse> getEventList(Pageable pageable, String keyword) {
        if (keyword != null && !keyword.isBlank()) {
            return eventRepository.searchByKeywordAdmin(keyword.trim(), pageable)
                    .map(AdminEventResponse::from)
                    .map(this::resolveThumb);
        }
        return eventRepository.findAll(pageable)
                .map(AdminEventResponse::from)
                .map(this::resolveThumb);
    }

    private AdminEventResponse resolveThumb(AdminEventResponse r) {
        return AdminEventResponse.builder()
                .id(r.getId())
                .title(r.getTitle())
                .placeName(r.getPlaceName())
                .placeAddress(r.getPlaceAddress())
                .regionName(r.getRegionName())
                .latitude(r.getLatitude())
                .longitude(r.getLongitude())
                .startAt(r.getStartAt())
                .endAt(r.getEndAt())
                .categories(r.getCategories())
                .status(r.getStatus())
                .filterGroup(r.getFilterGroup())
                .thumbnailKey(r.getThumbnailKey())
                .thumbnailUrl(s3UploadService.resolveUrl(r.getThumbnailKey()))
                .description(r.getDescription())
                .hostContact(r.getHostContact())
                .isAdminManaged(r.isAdminManaged())
                .extraJson(r.getExtraJson())
                .build();
    }

    /** 행사별 좋아요 수 (관리자용) - 좋아요 많은 순 */
    public List<AdminEventLikeCountDto> getEventLikeCounts() {
        List<Object[]> rows = eventLikeRepository.countGroupByEventId();
        if (rows.isEmpty()) return new ArrayList<>();

        List<Long> eventIds = rows.stream()
                .map(r -> ((Number) r[0]).longValue())
                .collect(Collectors.toList());
        Map<Long, Event> eventMap = eventRepository.findAllById(eventIds).stream()
                .collect(Collectors.toMap(Event::getId, e -> e));

        List<AdminEventLikeCountDto> result = new ArrayList<>();
        for (Object[] row : rows) {
            Long eventId = ((Number) row[0]).longValue();
            long count = ((Number) row[1]).longValue();
            String title = eventMap.containsKey(eventId) ? eventMap.get(eventId).getTitle() : "(삭제된 행사)";
            result.add(AdminEventLikeCountDto.builder()
                    .eventId(eventId)
                    .title(title)
                    .likeCount(count)
                    .build());
        }
        return result;
    }

    /** 행사별 조회수 (관리자용) - 누적 조회수 많은 순. 7일/30일은 클릭 로그에서 실시간 집계 */
    public List<AdminEventViewCountDto> getEventViewCounts() {
        List<Object[]> rows = clickLogRepository.findClickCountsAllTime();
        if (rows.isEmpty()) return new ArrayList<>();

        LocalDateTime since7d = LocalDateTime.now().minusDays(7);
        LocalDateTime since30d = LocalDateTime.now().minusDays(30);
        Map<Long, Long> count7d = clickLogRepository.findClickCountsByEventSince(since7d).stream()
                .collect(Collectors.toMap(r -> ((Number) r[0]).longValue(), r -> ((Number) r[1]).longValue()));
        Map<Long, Long> count30d = clickLogRepository.findClickCountsByEventSince(since30d).stream()
                .collect(Collectors.toMap(r -> ((Number) r[0]).longValue(), r -> ((Number) r[1]).longValue()));

        List<Long> eventIds = rows.stream()
                .map(r -> ((Number) r[0]).longValue())
                .collect(Collectors.toList());
        Map<Long, Event> eventMap = eventRepository.findAllById(eventIds).stream()
                .collect(Collectors.toMap(Event::getId, e -> e));

        List<AdminEventViewCountDto> result = new ArrayList<>();
        for (Object[] row : rows) {
            Long eventId = ((Number) row[0]).longValue();
            long total = ((Number) row[1]).longValue();
            Event event = eventMap.get(eventId);
            String title = event != null ? event.getTitle() : "(삭제된 행사)";
            int view7d = count7d.getOrDefault(eventId, 0L).intValue();
            int view30d = count30d.getOrDefault(eventId, 0L).intValue();
            result.add(AdminEventViewCountDto.builder()
                    .eventId(eventId)
                    .title(title)
                    .totalViewCount(total)
                    .viewCount7d(view7d)
                    .viewCount30d(view30d)
                    .build());
        }
        // 누적 조회수 많은 순으로 정렬
        result.sort((a, b) -> Long.compare(b.getTotalViewCount(), a.getTotalViewCount()));
        return result;
    }

    // 날짜 검증 로직
    private void validateDate(AdminEventCreateRequest request) {
        if (request.getEndAt() != null && request.getStartAt() != null
                && request.getEndAt().isBefore(request.getStartAt())) {
            throw new IllegalArgumentException("종료일이 시작일보다 빠를 수 없습니다.");
        }
    }
}