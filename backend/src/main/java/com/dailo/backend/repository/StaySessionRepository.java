package com.dailo.backend.repository;

import com.dailo.backend.entity.StaySession;
import com.dailo.backend.domain.enums.StayStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StaySessionRepository extends JpaRepository<StaySession, Long> {
    Optional<StaySession> findByMemberIdAndEventIdAndStatus(Long memberId, Long eventId, StayStatus status);
    boolean existsByMemberIdAndEventIdAndStatus(Long memberId, Long eventId, StayStatus status);

    /** 완료된 체류 세션 목록 (최신 완료순) */
    List<StaySession> findByMemberIdAndStatusOrderByEndTimeDesc(Long memberId, StayStatus status);

    /** 같은 행사에 대한 완료 세션 목록 (같은 날 중복 완료 여부 확인용) */
    List<StaySession> findByMemberIdAndEventIdAndStatusOrderByStartTimeDesc(Long memberId, Long eventId, StayStatus status);

    List<StaySession> findByStatus(StayStatus status);

    /** 구역 안에 있지만 참여 완료 기준 시간 이상 체류 중인 PENDING 세션 */
    @Query(value = "SELECT * FROM stay_session WHERE member_id = :memberId AND status = 'PENDING' AND TIMESTAMPDIFF(MINUTE, start_time, NOW()) >= :minMinutes ORDER BY start_time DESC", nativeQuery = true)
    List<StaySession> findPendingWithMinDuration(@Param("memberId") Long memberId, @Param("minMinutes") long minMinutes);

    /** 30분 이상 체류 중이지만 미션 알림을 아직 발송하지 않은 전체 PENDING 세션 */
    @Query(value = "SELECT * FROM stay_session WHERE status = 'PENDING' AND TIMESTAMPDIFF(MINUTE, start_time, NOW()) >= :minMinutes AND mission_notified_at IS NULL", nativeQuery = true)
    List<StaySession> findPendingNeedingMissionNotification(@Param("minMinutes") long minMinutes);
}