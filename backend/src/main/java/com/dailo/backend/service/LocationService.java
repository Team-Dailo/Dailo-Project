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
     * SecurityContext의 principal 이름(이메일 또는 회원 ID 문자열)을 실제 Member로 변환.
     * - 일반 로그인 토큰: subject = 이메일
     * - 일부 OAuth2/이메일 확인 토큰: subject = 회원 ID
     */
    private Member getMemberByPrincipal(String principal) {
        if (principal == null || principal.isBlank()) {
            throw new IllegalArgumentException("인증 정보가 없습니다.");
        }
        // 이메일 형태면 이메일로 조회
        if (principal.contains("@")) {
            return memberRepository.findByEmail(principal)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다. email: " + principal));
        }
        // 아니면 숫자 ID로 가정
        try {
            Long id = Long.parseLong(principal);
            return memberRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회원입니다. id: " + id));
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("유효하지 않은 인증 정보입니다.");
        }
    }

    /**
     * [체류 시작]
     */
    public Long startStay(String principal, LocationRequest request) {
        Member member = getMemberByPrincipal(principal);
        Long memberId = member.getId();

        Event event = eventRepository.findById(request.eventId())
                .orElseThrow(() -> new IllegalArgumentException("행사 없음"));

        // 같은 행사라도 다른 날이면 참여 시작 허용
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
     * [체류 완료]
     */
    public void completeStay(String principal, LocationRequest request) {
        Member member = getMemberByPrincipal(principal);
        Long memberId = member.getId();

        StaySession session = staySessionRepository.findByMemberIdAndEventIdAndStatus(memberId, request.eventId(), StayStatus.PENDING)
                .orElseThrow(() -> new IllegalArgumentException("진행 중인 세션이 없습니다."));

        // [부정 방지]
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

        // 같은 날 같은 행사 중복 기록 처리
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

    /** 완료된 체류 세션 목록 */
    @Transactional(readOnly = true)
    public List<StaySessionResponseDto> getCompletedSessions(String principal) {
        Long memberId = getMemberByPrincipal(principal).getId();
        List<StaySession> sessions = staySessionRepository.findByMemberIdAndStatusOrderByEndTimeDesc(memberId, StayStatus.COMPLETED);
        return sessions.stream()
                .map(this::toResponseDto)
                .collect(Collectors.toList());
    }

    /** 체류 미션 기록용 (30분 이상) */
    @Transactional(readOnly = true)
    public List<StaySessionResponseDto> getStayMissionSessions(String principal) {
        Long memberId = getMemberByPrincipal(principal).getId();
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