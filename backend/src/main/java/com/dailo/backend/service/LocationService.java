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

    private static final double ALLOWED_RADIUS_METER = 200.0;
    private static final double MAX_ALLOWED_MOVE_DISTANCE = 5000.0;

    private Member getMemberByEmail(String email) {
        return memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다. email: " + email));
    }

    /**
     * [체류 시작]
     * 옵션 B: 같은 날 PENDING이면 이어쓰기(기존 세션 id 반환)
     */
    public Long startStay(String email, LocationRequest request) {
        Member member = getMemberByEmail(email);
        Long memberId = member.getId();

        Event event = eventRepository.findById(request.eventId())
                .orElseThrow(() -> new IllegalArgumentException("행사 없음"));

        Optional<StaySession> pendingOpt = staySessionRepository
                .findByMemberIdAndEventIdAndStatus(memberId, event.getId(), StayStatus.PENDING);

        if (pendingOpt.isPresent()) {
            StaySession pending = pendingOpt.get();

            LocalDate pendingDate = pending.getStartTime() != null
                    ? pending.getStartTime().toLocalDate()
                    : LocalDate.now();

            if (pendingDate.equals(LocalDate.now())) {
                return pending.getId();
            }
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
     * [체류 완료]
     * - 완료는 행사장 반경 200m 내에서만 허용
     * - last좌표 ↔ 완료좌표 5km 초과면 FRAUD
     */
    public void completeStay(String email, LocationRequest request) {
        Member member = getMemberByEmail(email);
        Long memberId = member.getId();

        StaySession session = staySessionRepository
                .findByMemberIdAndEventIdAndStatus(memberId, request.eventId(), StayStatus.PENDING)
                .orElseThrow(() -> new IllegalArgumentException("진행 중인 세션이 없습니다."));

        Event event = session.getEvent();

        // 완료는 행사장 반경 200m 내에서만
        double distanceToEvent = GeometryUtils.calculateDistance(
                request.latitude(), request.longitude(),
                event.getLatitude(), event.getLongitude()
        );
        if (distanceToEvent > ALLOWED_RADIUS_METER) {
            session.markAsFraud(); // 정책: 강하게 처리
            throw new IllegalStateException("행사장 반경 밖에서는 체류 완료할 수 없습니다.");
        }

        // 5km 이동 체크
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

        // 완료 처리(중복 완료 비교 로직 유지)
        LocalDate today = session.getStartTime() != null ? session.getStartTime().toLocalDate() : LocalDate.now();
        List<StaySession> completedSameEvent = staySessionRepository
                .findByMemberIdAndEventIdAndStatusOrderByStartTimeDesc(memberId, request.eventId(), StayStatus.COMPLETED);

        Optional<StaySession> existingSameDay = completedSameEvent.stream()
                .filter(s -> s.getStartTime() != null && s.getStartTime().toLocalDate().equals(today))
                .findFirst();

        if (existingSameDay.isPresent()) {
            StaySession existing = existingSameDay.get();

            long existingMinutes = (existing.getStartTime() != null && existing.getEndTime() != null)
                    ? Duration.between(existing.getStartTime(), existing.getEndTime()).toMinutes()
                    : 0L;

            long currentMinutes = (session.getStartTime() != null)
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

    /**
     * [자동 종료용] 위치 ping
     * - 반경 밖이면 자동 종료(completeSession)
     * - 반경 안이면 위치 업데이트(= lastPingTime도 갱신됨)
     */
    public void checkLocation(String email, LocationRequest request) {
        Member member = getMemberByEmail(email);
        Long memberId = member.getId();

        Optional<StaySession> sessionOpt = staySessionRepository
                .findByMemberIdAndEventIdAndStatus(memberId, request.eventId(), StayStatus.PENDING);

        if (sessionOpt.isEmpty()) {
            return;
        }

        StaySession session = sessionOpt.get();
        Event event = session.getEvent();

        double distance = GeometryUtils.calculateDistance(
                request.latitude(), request.longitude(),
                event.getLatitude(), event.getLongitude()
        );

        if (distance > ALLOWED_RADIUS_METER) {
            session.completeSession();
            return;
        }

        session.updateLocation(request.latitude(), request.longitude());
    }

    /** 완료된 체류 세션 목록 */
    @Transactional(readOnly = true)
    public List<StaySessionResponseDto> getCompletedSessions(String email) {
        Long memberId = getMemberByEmail(email).getId();
        List<StaySession> sessions = staySessionRepository
                .findByMemberIdAndStatusOrderByEndTimeDesc(memberId, StayStatus.COMPLETED);
        return sessions.stream().map(this::toResponseDto).collect(Collectors.toList());
    }

    /** 체류 미션 기록용 (30분 이상) */
    @Transactional(readOnly = true)
    public List<StaySessionResponseDto> getStayMissionSessions(String email) {
        Long memberId = getMemberByEmail(email).getId();
        List<StaySession> sessions = staySessionRepository
                .findByMemberIdAndStatusOrderByEndTimeDesc(memberId, StayStatus.COMPLETED);
        return sessions.stream()
                .map(this::toResponseDto)
                .filter(dto -> dto.getDurationMinutes() >= 30L)
                .collect(Collectors.toList());
    }

    /** 실시간 체류 확인용 */
    @Transactional(readOnly = true)
    public Optional<StaySessionResponseDto> getActiveSession(String email, Long eventId) {
        Long memberId = getMemberByEmail(email).getId();
        return staySessionRepository
                .findByMemberIdAndEventIdAndStatus(memberId, eventId, StayStatus.PENDING)
                .map(this::toResponseDto);
    }

    private StaySessionResponseDto toResponseDto(StaySession s) {
        Event e = s.getEvent();

        LocalDateTime endCompareTime =
                (s.getEndTime() != null) ? s.getEndTime() : LocalDateTime.now();

        long minutes = (s.getStartTime() != null)
                ? (long) Math.ceil(Duration.between(s.getStartTime(), endCompareTime).toSeconds() / 60.0)
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