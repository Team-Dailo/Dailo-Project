package com.dailo.backend.repository;

import com.dailo.backend.entity.StaySession;
import com.dailo.backend.domain.enums.StayStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StaySessionRepository extends JpaRepository<StaySession, Long> {
    Optional<StaySession> findByMemberIdAndEventIdAndStatus(Long memberId, Long eventId, StayStatus status);
    boolean existsByMemberIdAndEventIdAndStatus(Long memberId, Long eventId, StayStatus status);

    /** 완료된 체류 세션 목록 (최신 완료순) */
    List<StaySession> findByMemberIdAndStatusOrderByEndTimeDesc(Long memberId, StayStatus status);

    /** 같은 행사에 대한 완료 세션 목록 (같은 날 중복 완료 여부 확인용) */
    List<StaySession> findByMemberIdAndEventIdAndStatusOrderByStartTimeDesc(Long memberId, Long eventId, StayStatus status);
}