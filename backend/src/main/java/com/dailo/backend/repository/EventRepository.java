package com.dailo.backend.repository;

import com.dailo.backend.entity.Event;
import com.dailo.backend.domain.enums.EventCategory;
import com.dailo.backend.domain.enums.EventStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {


    // 지도 뷰 - Bounds 기반 조회

    /**
     * 지도 화면(Viewport) 내의 행사 마커를 조회합니다.
     * deleted_at IS NULL 조건은 Entity의 @Where 어노테이션에 의해 자동 적용됩니다.
     */
    @Query("SELECT e FROM Event e " +
            "WHERE e.latitude BETWEEN :swLat AND :neLat " +
            "AND e.longitude BETWEEN :swLng AND :neLng " +
            "AND e.status = :status")
    List<Event> findEventsInBounds(
            @Param("swLat") Double swLat, @Param("neLat") Double neLat,
            @Param("swLng") Double swLng, @Param("neLng") Double neLng,
            @Param("status") EventStatus status
    );


    //  리스트 뷰


    // 관리자용 전체 조회
    Page<Event> findAll(Pageable pageable);

    // 상태만 필터링
    Page<Event> findAllByStatus(EventStatus status, Pageable pageable);

    // 상태 + 카테고리 필터링 (기간 X)
    Page<Event> findDistinctByStatusAndCategoriesIn(EventStatus status, List<EventCategory> categories, Pageable pageable);

    // 상태 + 기간 필터링 (카테고리 X)
    @Query("SELECT e FROM Event e WHERE e.status = :status " +
            "AND e.startAt <= :searchEnd " +
            "AND e.endAt >= :searchStart")
    Page<Event> findByStatusAndDate(
            @Param("status") EventStatus status,
            @Param("searchStart") LocalDateTime searchStart,
            @Param("searchEnd") LocalDateTime searchEnd,
            Pageable pageable);

    // 상태 + 카테고리 + 기간 필터링 (풀 옵션)
    @Query("SELECT DISTINCT e FROM Event e " +
            "JOIN e.categories c " +
            "WHERE e.status = :status " +
            "AND c IN :categories " +
            "AND e.startAt <= :searchEnd " +
            "AND e.endAt >= :searchStart")
    Page<Event> findByStatusAndCategoriesAndDate(
            @Param("status") EventStatus status,
            @Param("categories") List<EventCategory> categories,
            @Param("searchStart") LocalDateTime searchStart,
            @Param("searchEnd") LocalDateTime searchEnd,
            Pageable pageable);
}