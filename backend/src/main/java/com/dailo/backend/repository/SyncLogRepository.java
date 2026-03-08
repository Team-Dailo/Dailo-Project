package com.dailo.backend.repository;

import com.dailo.backend.domain.enums.SyncStatus;
import com.dailo.backend.entity.SyncLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SyncLogRepository extends JpaRepository<SyncLog, Long> {

    // 소스 타입별 로그 조회
    Page<SyncLog> findBySourceType(String sourceType, Pageable pageable);

    // 상태별 로그 조회
    Page<SyncLog> findByStatus(SyncStatus status, Pageable pageable);

    // 소스 + 상태별 로그 조회
    Page<SyncLog> findBySourceTypeAndStatus(String sourceType, SyncStatus status, Pageable pageable);

    // 최근 동기화 로그 (소스 타입별)
    List<SyncLog> findTop5BySourceTypeOrderByStartedAtDesc(String sourceType);
}
