package com.dailo.backend.repository;

import com.dailo.backend.domain.enums.ReportStatus;
import com.dailo.backend.domain.enums.ReportType;
import com.dailo.backend.entity.Report;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {

    // 내 신고 목록
    Page<Report> findByReporterId(Long reporterId, Pageable pageable);

    // 상태별 신고 목록 (관리자용)
    Page<Report> findByStatus(ReportStatus status, Pageable pageable);

    // 중복 신고 체크
    boolean existsByReporterIdAndTargetTypeAndTargetId(
            Long reporterId,
            ReportType targetType,
            Long targetId);
}
