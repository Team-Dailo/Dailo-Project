package com.dailo.backend.repository;

import com.dailo.backend.entity.Faq;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FaqRepository extends JpaRepository<Faq, Long> {

    // 사용자용: 활성화된 FAQ만 조회 (순서대로)
    List<Faq> findByIsActiveTrueOrderByDisplayOrderAscCreatedAtDesc();

    // 사용자용: 카테고리별 조회
    List<Faq> findByCategoryAndIsActiveTrueOrderByDisplayOrderAsc(String category);

    // 관리자용: 전체 조회
    Page<Faq> findAllByOrderByDisplayOrderAscCreatedAtDesc(Pageable pageable);

    // 카테고리 목록 조회
    List<String> findDistinctCategoryByIsActiveTrue();
}
