package com.dailo.backend.service;

import com.dailo.backend.entity.Event;
import com.dailo.backend.entity.EventHistory;
import com.dailo.backend.domain.enums.EventStatus;
import com.dailo.backend.dto.AdminEventCreateRequest;
import com.dailo.backend.dto.AdminEventResponse;
import com.dailo.backend.repository.EventRepository;
import com.dailo.backend.repository.EventHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true) // 기본적으로 조회 모드
public class AdminEventService {

    private final EventRepository eventRepository;
    private final EventHistoryRepository eventHistoryRepository;

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
                request.getFilterGroup()
        );

        return event.getId();
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

        return AdminEventResponse.from(event);
    }

    //행사 목록 조회 (페이징)
    public Page<AdminEventResponse> getEventList(Pageable pageable) {
        // Entity List -> AdminResponse List 변환
        return eventRepository.findAll(pageable)
                .map(AdminEventResponse::from);
    }

    // 날짜 검증 로직
    private void validateDate(AdminEventCreateRequest request) {
        if (request.getEndAt() != null && request.getStartAt() != null
                && request.getEndAt().isBefore(request.getStartAt())) {
            throw new IllegalArgumentException("종료일이 시작일보다 빠를 수 없습니다.");
        }
    }
}