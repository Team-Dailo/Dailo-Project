package com.dailo.backend.repository;

import com.dailo.backend.domain.enums.ReportStatus;
import com.dailo.backend.domain.enums.ReportType;
import com.dailo.backend.entity.Report;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {

    // 대시보드 통계용
    long countByStatus(ReportStatus status);

    /** 신고된 게시물 ID별 신고 수 (targetType=POST, PENDING만) */
    @Query("SELECT r.targetId, COUNT(r) FROM Report r WHERE r.targetType = :type AND r.status = :status GROUP BY r.targetId")
    List<Object[]> countByTargetTypeAndStatusGroupByTargetId(@Param("type") ReportType type, @Param("status") ReportStatus status);

    /** 특정 대상에 대한 신고 수 (상태 무관, 자동 삭제 판단용) */
    long countByTargetTypeAndTargetId(ReportType type, Long targetId);

    /** 신고된 게시물 ID별 신고 수 (targetType=POST, 상태 무관 - 신고 기록용) */
    @Query("SELECT r.targetId, COUNT(r) FROM Report r WHERE r.targetType = :type GROUP BY r.targetId")
    List<Object[]> countByTargetTypeGroupByTargetId(@Param("type") ReportType type);

    // 내 신고 목록
    Page<Report> findByReporterId(Long reporterId, Pageable pageable);

    // 상태별 신고 목록 (관리자용)
    Page<Report> findByStatus(ReportStatus status, Pageable pageable);

    // 중복 신고 체크
    boolean existsByReporterIdAndTargetTypeAndTargetId(
            Long reporterId,
            ReportType targetType,
            Long targetId);

    // 타입별 신고 목록 (관리자용)
    Page<Report> findByTargetType(ReportType targetType, Pageable pageable);

    // 상태 + 타입별 신고 목록 (관리자용)
    Page<Report> findByStatusAndTargetType(ReportStatus status, ReportType targetType, Pageable pageable);
}
