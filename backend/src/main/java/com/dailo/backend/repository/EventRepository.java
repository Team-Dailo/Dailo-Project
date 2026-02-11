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

    // 지도 뷰
    @Query("SELECT e FROM Event e " +
            "WHERE e.latitude BETWEEN :swLat AND :neLat " +
            "AND e.longitude BETWEEN :swLng AND :neLng " +
            "AND e.status = :status")
    List<Event> findEventsInBounds(
            @Param("swLat") Double swLat, @Param("neLat") Double neLat,
            @Param("swLng") Double swLng, @Param("neLng") Double neLng,
            @Param("status") EventStatus status
    );



    // 리스트 뷰 - 통합 검색 쿼리


    /**
     * [통합 검색]
     * 키워드, 지역, 카테고리, 날짜 조건을 한 번에 처리합니다.
     * 파라미터가 NULL이면 해당 조건은 무시(전체 조회)됩니다.
     */
    @Query("SELECT DISTINCT e FROM Event e " +
            "LEFT JOIN e.categories c " + // 카테고리 조건을 위해 조인
            "WHERE e.status = :status " +
            // 1. 날짜 범위 (교집합 검색: 행사가 검색 기간에 조금이라도 걸치면 조회)
            "AND (:startAt IS NULL OR e.endAt >= :startAt) " +
            "AND (:endAt IS NULL OR e.startAt <= :endAt) " +
            // 2. 카테고리 (없으면 전체, 있으면 해당 카테고리 포함된 것만)
            "AND (:categories IS NULL OR c IN :categories) " +
            // 3. 지역 필터 (주소에 해당 지역명이 포함되는지)
            "AND (:region IS NULL OR e.placeAddress LIKE %:region%) " +
            // 4. 키워드 검색 (제목, 장소명, 내용(description)에 키워드 포함)
            "AND (:keyword IS NULL OR :keyword = '' OR (e.title LIKE CONCAT('%', :keyword, '%') OR e.placeName LIKE CONCAT('%', :keyword, '%') OR e.description LIKE CONCAT('%', :keyword, '%')))")
    Page<Event> searchEvents(
            @Param("status") EventStatus status,
            @Param("startAt") LocalDateTime startAt,
            @Param("endAt") LocalDateTime endAt,
            @Param("categories") List<EventCategory> categories,
            @Param("region") String region,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    // (관리자용 전체 조회는 필요하다면 남겨둡니다)
    Page<Event> findAll(Pageable pageable);

    //  캘린더 월별 조회
    //  해당 월(start~end)에 조금이라도 걸쳐 있는 모든 이벤트를 조회합니다.
    //        N+1 문제를 방지하기 위해 카테고리를 함께 가져옵니다 (JOIN FETCH).
    @Query("SELECT DISTINCT e FROM Event e " +
            "LEFT JOIN FETCH e.categories " +
            "WHERE e.status = 'ACTIVE' " +  // (중요) 삭제되거나 숨김 처리된 건 제외
            "AND e.startAt < :endOfMonth " +
            "AND e.endAt > :startOfMonth")
    List<Event> findEventsForCalendar(@Param("startOfMonth") LocalDateTime startOfMonth,
                                      @Param("endOfMonth") LocalDateTime endOfMonth);

    /** 시드 데이터 중복 방지: 제목에 해당 문자열이 포함된 이벤트 존재 여부 */
    boolean existsByTitleContaining(String keyword);

    /** 제목이 정확히 일치하는 이벤트 목록 (이전 시드 삭제용) */
    List<Event> findByTitleIn(List<String> titles);
}

