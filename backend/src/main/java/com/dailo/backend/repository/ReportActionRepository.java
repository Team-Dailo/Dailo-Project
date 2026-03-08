package com.dailo.backend.repository;

import com.dailo.backend.entity.Report;
import com.dailo.backend.entity.ReportActionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportActionRepository extends JpaRepository<ReportActionEntity, Long> {

    // 특정 신고의 처리 이력
    List<ReportActionEntity> findByReportOrderByCreatedAtDesc(Report report);
}
