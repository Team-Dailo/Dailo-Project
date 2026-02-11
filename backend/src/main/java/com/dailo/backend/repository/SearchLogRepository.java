package com.dailo.backend.repository;

import com.dailo.backend.entity.SearchLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SearchLogRepository extends JpaRepository<SearchLog, Long> {

    // 사용자별 검색 기록
    Page<SearchLog> findByUserId(Long userId, Pageable pageable);

    // 키워드별 검색 (인기 키워드 분석용)
    Page<SearchLog> findByKeywordContaining(String keyword, Pageable pageable);

    // 기간별 조회
    Page<SearchLog> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);

    // 인기 검색어 Top N
    @Query("SELECT s.keyword, COUNT(s) as cnt FROM SearchLog s " +
           "WHERE s.createdAt >= :since " +
           "GROUP BY s.keyword ORDER BY cnt DESC")
    List<Object[]> findTopKeywords(@Param("since") LocalDateTime since, Pageable pageable);

    // 요청 ID로 조회 (클릭 로그와 연결)
    List<SearchLog> findByRequestId(String requestId);
}
