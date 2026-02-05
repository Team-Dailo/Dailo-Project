package com.dailo.backend.repository;

import com.dailo.backend.entity.IngestLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface IngestLogRepository extends JpaRepository<IngestLog, Long> {

    // 배치 ID로 조회
    Optional<IngestLog> findByBatchId(String batchId);

    // 소스별 조회
    Page<IngestLog> findBySource(String source, Pageable pageable);

    // 기간별 조회
    Page<IngestLog> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);

    // 최근 로그 조회
    Page<IngestLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
