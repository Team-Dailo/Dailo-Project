package com.dailo.backend.repository;

import com.dailo.backend.entity.Event;
import com.dailo.backend.entity.EventSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EventSourceRepository extends JpaRepository<EventSource, Long> {

    // 이벤트의 소스 목록
    List<EventSource> findByEvent(Event event);

    // 소스 타입 + 외부 ID로 조회 (중복 체크용)
    Optional<EventSource> findBySourceTypeAndExternalId(String sourceType, String externalId);

    // 외부 ID 존재 여부 체크
    boolean existsBySourceTypeAndExternalId(String sourceType, String externalId);
}
