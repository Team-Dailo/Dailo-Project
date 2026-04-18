package com.dailo.backend.repository;

import com.dailo.backend.entity.AdminLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdminLogRepository extends JpaRepository<AdminLog, Long> {

    // 전체 로그 조회 (최신순)
    Page<AdminLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    // 특정 관리자의 활동 로그
    Page<AdminLog> findByAdminIdOrderByCreatedAtDesc(Long adminId, Pageable pageable);

    // 특정 액션 타입의 로그
    Page<AdminLog> findByActionOrderByCreatedAtDesc(String action, Pageable pageable);

    // 특정 대상 타입의 로그
    Page<AdminLog> findByTargetTypeOrderByCreatedAtDesc(String targetType, Pageable pageable);

    // 특정 대상의 로그
    Page<AdminLog> findByTargetTypeAndTargetIdOrderByCreatedAtDesc(String targetType, Long targetId, Pageable pageable);
}
