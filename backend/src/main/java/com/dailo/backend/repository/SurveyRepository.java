package com.dailo.backend.repository;

import com.dailo.backend.entity.Survey;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SurveyRepository extends JpaRepository<Survey, Long> {
    boolean existsByMemberIdAndEventId(Long memberId, Long eventId);
    Page<Survey> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<Survey> findByEventIdOrderByCreatedAtDesc(Long eventId, Pageable pageable);
}
