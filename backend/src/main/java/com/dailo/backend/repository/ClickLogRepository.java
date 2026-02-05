package com.dailo.backend.repository;

import com.dailo.backend.entity.ClickLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ClickLogRepository extends JpaRepository<ClickLog, Long> {

    // 사용자별 클릭 기록
    Page<ClickLog> findByUserId(Long userId, Pageable pageable);

    // 이벤트별 클릭 수
    long countByEventId(Long eventId);

    // 기간별 이벤트 클릭 수
    long countByEventIdAndCreatedAtBetween(Long eventId, LocalDateTime start, LocalDateTime end);

    // 유입 경로별 조회
    Page<ClickLog> findBySource(String source, Pageable pageable);

    // 인기 이벤트 Top N (클릭 수 기준)
    @Query("SELECT c.eventId, COUNT(c) as cnt FROM ClickLog c " +
           "WHERE c.createdAt >= :since " +
           "GROUP BY c.eventId ORDER BY cnt DESC")
    List<Object[]> findTopClickedEvents(@Param("since") LocalDateTime since, Pageable pageable);

    // 요청 ID로 조회 (검색-클릭 전환 분석용)
    List<ClickLog> findByRequestId(String requestId);
}
