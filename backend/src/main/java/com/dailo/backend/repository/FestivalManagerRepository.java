package com.dailo.backend.repository;

import com.dailo.backend.entity.FestivalManager;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FestivalManagerRepository extends JpaRepository<FestivalManager, Long> {

    List<FestivalManager> findByMemberId(Long memberId);

    List<FestivalManager> findByEventId(Long eventId);

    boolean existsByMemberIdAndEventId(Long memberId, Long eventId);

    @Query("SELECT fm.event.id FROM FestivalManager fm WHERE fm.member.id = :memberId")
    List<Long> findEventIdsByMemberId(@Param("memberId") Long memberId);

    void deleteByMemberIdAndEventId(Long memberId, Long eventId);
}
