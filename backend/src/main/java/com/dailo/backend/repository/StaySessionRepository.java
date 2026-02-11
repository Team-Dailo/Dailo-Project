package com.dailo.backend.repository;

import com.dailo.backend.entity.StaySession;
import com.dailo.backend.domain.enums.StayStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface StaySessionRepository extends JpaRepository<StaySession, Long> {
    // 특정 유저가 특정 행사에서 '진행 중(PENDING)'인 세션이 있는지 확인
    Optional<StaySession> findByMemberIdAndEventIdAndStatus(Long memberId, Long eventId, StayStatus status);

    // 중복 참여 방지
    boolean existsByMemberIdAndEventIdAndStatus(Long memberId, Long eventId, StayStatus status);
}