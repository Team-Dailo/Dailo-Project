package com.dailo.backend.repository;

import com.dailo.backend.entity.Scrap;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.Set;

public interface ScrapRepository extends JpaRepository<Scrap, Long> {

    // 스크랩 여부 확인 (Toggle 구현용)
    Optional<Scrap> findByMemberIdAndEventId(Long memberId, Long eventId);

    // 내 스크랩 목록 조회
    @Query("SELECT s FROM Scrap s " +
            "JOIN FETCH s.event " +
            "WHERE s.member.id = :memberId")
    Page<Scrap> findAllByMemberId(@Param("memberId") Long memberId, Pageable pageable);

    // 캘린더 조회 시 북마크 여부 확인용
    @Query("SELECT s.event.id FROM Scrap s WHERE s.member.id = :memberId")
    Set<Long> findScrappedEventIds(@Param("memberId") Long memberId);
}