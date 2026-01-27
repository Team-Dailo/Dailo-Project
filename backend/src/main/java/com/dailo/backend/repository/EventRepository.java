package com.dailo.backend.repository;

import com.dailo.backend.domain.enums.EventCategory;
import com.dailo.backend.entity.Event;
import com.dailo.backend.domain.enums.EventStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

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

    // 상태 + 카테고리 필터링 (기간 X)
    // Spring Data JPA가 알아서 JOIN을 처리해주지만, 중복 방지를 위해 Distinct 추가 권장
    Page<Event> findDistinctByStatusAndCategoriesIn(EventStatus status, List<EventCategory> categories, Pageable pageable);

    // 상태만 필터링 (기간 X, 카테고리 X)
    Page<Event> findAllByStatus(EventStatus status, Pageable pageable);

    // 상태 + 카테고리 + 기간 필터링 (여기가 문제였음!)
    @Query("SELECT DISTINCT e FROM Event e " +
            "JOIN e.categories c " +
            "WHERE e.status = :status " +
            "AND c IN :categories " +
            "AND e.startDateTime <= :searchEnd " +
            "AND e.endDateTime >= :searchStart")
    Page<Event> findByStatusAndCategoriesAndDate(
            @Param("status") EventStatus status,
            @Param("categories") List<EventCategory> categories,
            @Param("searchStart") LocalDateTime searchStart,
            @Param("searchEnd") LocalDateTime searchEnd,
            Pageable pageable);

    // 상태 + 기간 필터링 (카테고리 없을 때)
    @Query("SELECT e FROM Event e WHERE e.status = :status " +
            "AND e.startDateTime <= :searchEnd " +
            "AND e.endDateTime >= :searchStart")
    Page<Event> findByStatusAndDate(
            @Param("status") EventStatus status,
            @Param("searchStart") LocalDateTime searchStart,
            @Param("searchEnd") LocalDateTime searchEnd,
            Pageable pageable);

}