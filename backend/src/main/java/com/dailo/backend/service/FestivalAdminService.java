package com.dailo.backend.service;

import com.dailo.backend.domain.enums.Role;
import com.dailo.backend.dto.admin.EventActivityStatsDto;
import com.dailo.backend.entity.Event;
import com.dailo.backend.entity.FestivalManager;
import com.dailo.backend.entity.Member;
import com.dailo.backend.exception.ForbiddenException;
import com.dailo.backend.exception.NotFoundException;
import com.dailo.backend.repository.ClickLogRepository;
import com.dailo.backend.repository.EventRepository;
import com.dailo.backend.repository.FestivalManagerRepository;
import com.dailo.backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FestivalAdminService {

    private final FestivalManagerRepository festivalManagerRepository;
    private final MemberRepository memberRepository;
    private final EventRepository eventRepository;
    private final ClickLogRepository clickLogRepository;

    /**
     * 특정 회원이 관리하는 축제 ID 목록
     */
    public List<Long> getManagedEventIds(Long memberId) {
        return festivalManagerRepository.findEventIdsByMemberId(memberId);
    }

    /**
     * 특정 회원이 해당 축제를 관리할 권한이 있는지 확인
     */
    public boolean canManageEvent(Long memberId, Long eventId) {
        Member member = memberRepository.findById(memberId).orElse(null);
        if (member == null) return false;

        // ADMIN은 모든 축제 관리 가능
        if (member.getRole() == Role.ADMIN) return true;

        // FESTIVAL_ADMIN은 할당된 축제만 관리 가능
        return festivalManagerRepository.existsByMemberIdAndEventId(memberId, eventId);
    }

    /**
     * 권한 확인 후 예외 발생
     */
    public void checkManagePermission(Long memberId, Long eventId) {
        if (!canManageEvent(memberId, eventId)) {
            throw new ForbiddenException("이 축제를 관리할 권한이 없습니다.");
        }
    }

    /**
     * 특정 날짜의 시간대별 활동 통계 조회
     */
    public EventActivityStatsDto getEventActivityStats(Long eventId, LocalDate date) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new NotFoundException("축제를 찾을 수 없습니다."));

        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.atTime(LocalTime.MAX);

        List<Object[]> hourlyData = clickLogRepository.findHourlyClickCountsByEventId(eventId, start, end);

        // 0-23시 데이터를 맵으로 변환
        Map<Integer, Long> hourMap = hourlyData.stream()
                .collect(Collectors.toMap(
                        row -> ((Number) row[0]).intValue(),
                        row -> ((Number) row[1]).longValue()
                ));

        // 0-23시 전체 리스트 생성 (데이터 없으면 0)
        List<EventActivityStatsDto.HourlyCount> hourlyCounts = new ArrayList<>();
        long totalViews = 0;
        for (int hour = 0; hour < 24; hour++) {
            long count = hourMap.getOrDefault(hour, 0L);
            hourlyCounts.add(new EventActivityStatsDto.HourlyCount(hour, count));
            totalViews += count;
        }

        return EventActivityStatsDto.builder()
                .eventId(eventId)
                .eventTitle(event.getTitle())
                .date(date)
                .hourlyCounts(hourlyCounts)
                .totalViews((int) totalViews)
                .build();
    }

    /**
     * 축제 관리자 할당 (앱 관리자 전용)
     */
    @Transactional
    public void assignFestivalManager(Long eventId, Long memberId, Long adminId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new NotFoundException("회원을 찾을 수 없습니다."));

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new NotFoundException("축제를 찾을 수 없습니다."));

        if (festivalManagerRepository.existsByMemberIdAndEventId(memberId, eventId)) {
            throw new IllegalStateException("이미 해당 축제의 관리자로 등록되어 있습니다.");
        }

        // Role을 FESTIVAL_ADMIN으로 변경 (USER인 경우)
        if (member.getRole() == Role.USER) {
            member.setRole(Role.FESTIVAL_ADMIN);
        }

        FestivalManager manager = FestivalManager.builder()
                .member(member)
                .event(event)
                .createdBy(adminId)
                .build();

        festivalManagerRepository.save(manager);
    }

    /**
     * 축제 관리자 해제 (앱 관리자 전용)
     */
    @Transactional
    public void removeFestivalManager(Long eventId, Long memberId) {
        if (!festivalManagerRepository.existsByMemberIdAndEventId(memberId, eventId)) {
            throw new NotFoundException("해당 축제 관리자를 찾을 수 없습니다.");
        }

        festivalManagerRepository.deleteByMemberIdAndEventId(memberId, eventId);

        // 더 이상 관리하는 축제가 없으면 Role을 USER로 변경
        List<Long> remainingEvents = festivalManagerRepository.findEventIdsByMemberId(memberId);
        if (remainingEvents.isEmpty()) {
            Member member = memberRepository.findById(memberId).orElse(null);
            if (member != null && member.getRole() == Role.FESTIVAL_ADMIN) {
                member.setRole(Role.USER);
            }
        }
    }

    /**
     * 특정 축제의 관리자 목록 조회
     */
    public List<FestivalManager> getEventManagers(Long eventId) {
        return festivalManagerRepository.findByEventId(eventId);
    }
}
