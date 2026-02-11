package com.dailo.backend.repository;

import com.dailo.backend.entity.EventLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EventLikeRepository extends JpaRepository<EventLike, Long> {

    Optional<EventLike> findByMemberIdAndEventId(Long memberId, Long eventId);

    boolean existsByMemberIdAndEventId(Long memberId, Long eventId);

    void deleteByMemberIdAndEventId(Long memberId, Long eventId);
}
