package com.dailo.backend.repository;

import com.dailo.backend.entity.AppPopup;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AppPopupRepository extends JpaRepository<AppPopup, Long> {

    @Query("SELECT p FROM AppPopup p WHERE p.isActive = true " +
           "AND (p.startAt IS NULL OR p.startAt <= :now) " +
           "AND (p.endAt IS NULL OR p.endAt >= :now) " +
           "ORDER BY p.displayOrder ASC, p.createdAt DESC")
    List<AppPopup> findActivePopups(@Param("now") LocalDateTime now);

    Page<AppPopup> findAllByOrderByDisplayOrderAscCreatedAtDesc(Pageable pageable);
}
