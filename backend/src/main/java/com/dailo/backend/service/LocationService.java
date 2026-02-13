package com.dailo.backend.service;

import com.dailo.backend.domain.enums.StayStatus;
import com.dailo.backend.dto.location.LocationRequest;
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
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional
public class LocationService {

    private final StaySessionRepository staySessionRepository;
    private final EventRepository eventRepository;
    private final MemberRepository memberRepository;

    private static final double ALLOWED_RADIUS_METER = 50.0; // 행사장 반경 허용치
    private static final long REQUIRED_STAY_MINUTES = 30;    // 필수 체류 시간
    private static final double MAX_ALLOWED_MOVE_DISTANCE = 5000.0; // 30분간 최대 이동 가능 거리 (예: 5km)

    /**
     * [체류 시작]
     */
    public Long startStay(Long memberId, LocationRequest request) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("유저 없음"));
        Event event = eventRepository.findById(request.eventId())
                .orElseThrow(() -> new IllegalArgumentException("행사 없음"));

        if (staySessionRepository.existsByMemberIdAndEventIdAndStatus(memberId, event.getId(), StayStatus.COMPLETED)) {
            throw new IllegalStateException("이미 인증을 완료한 행사입니다.");
        }

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
     * [체류 완료] 부정 방지 로직 포함
     */
    public void completeStay(Long memberId, LocationRequest request) { // LocationRequest를 받도록 수정

        StaySession session = staySessionRepository.findByMemberIdAndEventIdAndStatus(memberId, request.eventId(), StayStatus.PENDING)
                .orElseThrow(() -> new IllegalArgumentException("진행 중인 세션이 없습니다."));

        // [부정 방지] 시작 위치와 종료 위치 비교
        double distanceBetweenCheckins = GeometryUtils.calculateDistance(
                session.getLastLatitude(), session.getLastLongitude(),
                request.latitude(), request.longitude()
        );

        if (distanceBetweenCheckins > MAX_ALLOWED_MOVE_DISTANCE) {
            session.markAsFraud(); // 상태를 FRAUD로 변경
            throw new IllegalStateException("비정상적인 위치 이동이 감지되었습니다. 부정 사용자로 분류됩니다.");
        }

        // 시간 체크
        Duration duration = Duration.between(session.getStartTime(), LocalDateTime.now());
        if (duration.toMinutes() < REQUIRED_STAY_MINUTES) {
            throw new IllegalStateException("아직 30분이 지나지 않았습니다.");
        }

        // 거리 체크 (완료 시점에도 행사장 근처여야 함)
        Event event = session.getEvent();
        double finalDistance = GeometryUtils.calculateDistance(
                request.latitude(), request.longitude(),
                event.getLatitude(), event.getLongitude()
        );

        if (finalDistance > ALLOWED_RADIUS_METER) {
            throw new IllegalArgumentException("행사장을 벗어났습니다. 인증에 실패했습니다.");
        }

        session.completeSession();
    }
}