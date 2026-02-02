package com.dailo.backend.repository;

import com.dailo.backend.entity.Scrap;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ScrapRepository extends JpaRepository<Scrap, Long> {

    // 1. 스크랩 여부 확인 (Toggle 구현용)
    // "누가(memberId) 어떤 행사(eventId)를 찜했는지 찾기"
    Optional<Scrap> findByMemberIdAndEventId(Long memberId, Long eventId);

    // 2. 내 스크랩 목록 조회 (성능 최적화)
    // 일반 조회를 하면 Event 정보를 가져올 때마다 쿼리가 추가로 나가는 문제(N+1)가 발생합니다.
    // JOIN FETCH를 써서 스크랩과 행사 정보를 한 번의 쿼리로 가져옵니다.
    @Query("SELECT s FROM Scrap s " +
            "JOIN FETCH s.event " +
            "WHERE s.member.id = :memberId")
    Page<Scrap> findAllByMemberId(@Param("memberId") Long memberId, Pageable pageable);
}