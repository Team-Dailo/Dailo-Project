package com.dailo.backend.service;

import com.dailo.backend.domain.enums.StayStatus;
import com.dailo.backend.dto.location.LocationRequest;
import com.dailo.backend.dto.location.StaySessionResponseDto;
import com.dailo.backend.entity.Event;
import com.dailo.backend.entity.Member;
import com.dailo.backend.entity.StaySession;
import com.dailo.backend.repository.EventRepository;
import com.dailo.backend.repository.MemberRepository;
import com.dailo.backend.repository.StaySessionRepository;
import com.dailo.backend.util.GeometryUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class LocationService {

    private final StaySessionRepository staySessionRepository;
    private final EventRepository eventRepository;
    private final MemberRepository memberRepository;

    private static final double ALLOWED_RADIUS_METER = 200.0; // 행사장 반경 허용치 (앱과 동일, 200m)
    private static final double MAX_ALLOWED_MOVE_DISTANCE = 5000.0; // 부정 방지: 완료 요청 시 최대 이동 가능 거리

    /**
     * [체류 시작]
     */
    public Long startStay(Long memberId, LocationRequest request) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("유저 없음"));
        Event event = eventRepository.findById(request.eventId())
                .orElseThrow(() -> new IllegalArgumentException("행사 없음"));

        // 같은 행사라도 다른 날이면 참여 시작 허용 (같은 날 여러 번 방문 시에는 완료 시 한 건만 남김)
        if (staySessionRepository.findByMemberIdAndEventIdAndStatus(memberId, event.getId(), StayStatus.PENDING).isPresent()) {
            throw new IllegalStateException("이미 체류 인증이 진행 중입니다.");
        }

        double distance = GeometryUtils.calculateDistance(
                request.latitude(), request.longitude(),
                event.getLatitude(), event.getLongitude()
        );

        if (distance > ALLOWED_RADIUS_METER) {
            throw new IllegalArgumentException("행사장 근처가 아닙니다.");
        }

        StaySession session = StaySession.builder()
                .member(member)
                .event(event)
                .lat(request.latitude())
                .lng(request.longitude())
                .build();

        return staySessionRepository.save(session).getId();
    }

    /**
     * [체류 완료] 1초라도 구역에 있었으면 기록 (날짜·진입시간·체류시간 저장).
     * 같은 축제를 하루에 여러 번 방문해도 해당 날짜에는 한 건만 남기고, 다른 날 방문은 각각 기록함.
     */
    public void completeStay(Long memberId, LocationRequest request) {
        StaySession session = staySessionRepository.findByMemberIdAndEventIdAndStatus(memberId, request.eventId(), StayStatus.PENDING)
                .orElseThrow(() -> new IllegalArgumentException("진행 중인 세션이 없습니다."));

        // [부정 방지] 시작 시 기록된 위치와 현재 요청 위치 비교
        if (session.getLastLatitude() != null && session.getLastLongitude() != null) {
            double distanceBetweenCheckins = GeometryUtils.calculateDistance(
                    session.getLastLatitude(), session.getLastLongitude(),
                    request.latitude(), request.longitude()
            );
            if (distanceBetweenCheckins > MAX_ALLOWED_MOVE_DISTANCE) {
                session.markAsFraud();
                throw new IllegalStateException("비정상적인 위치 이동이 감지되었습니다.");
            }
        }

        // 같은 날 같은 행사로 이미 완료된 기록이 있으면, 체류시간이 더 긴 쪽만 남김
        LocalDate today = session.getStartTime() != null ? session.getStartTime().toLocalDate() : LocalDate.now();
        List<StaySession> completedSameEvent = staySessionRepository.findByMemberIdAndEventIdAndStatusOrderByStartTimeDesc(
                memberId, request.eventId(), StayStatus.COMPLETED);
        Optional<StaySession> existingSameDay = completedSameEvent.stream()
                .filter(s -> s.getStartTime() != null && s.getStartTime().toLocalDate().equals(today))
                .findFirst();
        if (existingSameDay.isPresent()) {
            StaySession existing = existingSameDay.get();
            long existingMinutes = existing.getStartTime() != null && existing.getEndTime() != null
                    ? Duration.between(existing.getStartTime(), existing.getEndTime()).toMinutes()
                    : 0L;
            long currentMinutes = session.getStartTime() != null
                    ? Duration.between(session.getStartTime(), LocalDateTime.now()).toMinutes()
                    : 0L;
            if (currentMinutes > existingMinutes) {
                staySessionRepository.delete(existing);
                session.completeSession();
            } else {
                staySessionRepository.delete(session);
            }
            return;
        }

        session.completeSession();
    }

    /** 완료된 체류 세션 목록 (참여한 축제: 1초라도 있었으면, 같은 날 같은 행사 1건) */
    @Transactional(readOnly = true)
    public List<StaySessionResponseDto> getCompletedSessions(Long memberId) {
        List<StaySession> sessions = staySessionRepository.findByMemberIdAndStatusOrderByEndTimeDesc(memberId, StayStatus.COMPLETED);
        return sessions.stream()
                .map(this::toResponseDto)
                .collect(Collectors.toList());
    }

    /** 체류 미션 기록용: 30분 이상 체류한 세션만 (진입·퇴장 시간 기록) */
    @Transactional(readOnly = true)
    public List<StaySessionResponseDto> getStayMissionSessions(Long memberId) {
        List<StaySession> sessions = staySessionRepository.findByMemberIdAndStatusOrderByEndTimeDesc(memberId, StayStatus.COMPLETED);
        return sessions.stream()
                .map(this::toResponseDto)
                .filter(dto -> dto.getDurationMinutes() >= 30L)
                .collect(Collectors.toList());
    }

    private StaySessionResponseDto toResponseDto(StaySession s) {
        Event e = s.getEvent();
        long minutes = s.getEndTime() != null && s.getStartTime() != null
                ? Duration.between(s.getStartTime(), s.getEndTime()).toMinutes()
                : 0L;
        return StaySessionResponseDto.builder()
                .id(s.getId())
                .eventId(e.getId())
                .eventTitle(e.getTitle())
                .placeName(e.getPlaceName())
                .startTime(s.getStartTime())
                .endTime(s.getEndTime())
                .durationMinutes(minutes)
                .build();
    }
}