package com.dailo.backend.repository;

import com.dailo.backend.entity.EventLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EventLikeRepository extends JpaRepository<EventLike, Long> {

    Optional<EventLike> findByMemberIdAndEventId(Long memberId, Long eventId);

    boolean existsByMemberIdAndEventId(Long memberId, Long eventId);

    void deleteByMemberIdAndEventId(Long memberId, Long eventId);

    long countByEvent_Id(Long eventId);

    /** 지도/검색 응답용: 여러 행사 ID에 대한 좋아요 수 (event_id, count) */
    @Query("SELECT el.event.id, COUNT(el) FROM EventLike el WHERE el.event.id IN :eventIds GROUP BY el.event.id")
    List<Object[]> countByEventIds(@Param("eventIds") List<Long> eventIds);

    /** 행사별 좋아요 수 (event_id, count) - 관리자용 */
    @Query(value = "SELECT el.event_id, COUNT(*) FROM event_like el GROUP BY el.event_id ORDER BY COUNT(*) DESC", nativeQuery = true)
    List<Object[]> countGroupByEventId();
}
