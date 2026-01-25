package com.dailo.backend.repository;

import com.dailo.backend.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

// 해당 인터페이스는 Repository -> 자동 구현체 구현
@Repository
// event -> 다룰 entity 타입, long -> event의 id 타입
public interface EventRepository extends JpaRepository<Event, Long> {
    // 기본 CRUD 메서드 자동 제공:
    // - List<Event> findAll() 전체 조회
    // - Optional<Event> findById(Long id) ID로 조회
    // - Event save(Event event) 저장/수정
    // - void deleteById(Long id) ID로 삭제
    // - long count() 개수 조회
    // - boolean existsById(Long id) 존재 여부 확인
}