package com.dailo.backend.repository;

import com.dailo.backend.domain.enums.InquiryStatus;
import com.dailo.backend.entity.Inquiry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InquiryRepository extends JpaRepository<Inquiry, Long> {

    Page<Inquiry> findAllByOrderByCreatedAtDesc(Pageable pageable);

    // 대시보드 및 상태별 조회용
    long countByStatus(InquiryStatus status);

    Page<Inquiry> findByStatusOrderByCreatedAtDesc(InquiryStatus status, Pageable pageable);
}
