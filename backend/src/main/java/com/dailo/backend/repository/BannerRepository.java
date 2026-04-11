package com.dailo.backend.repository;

import com.dailo.backend.entity.Banner;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BannerRepository extends JpaRepository<Banner, Long> {

    // 사용자용: 현재 활성화된 배너 조회
    @Query("SELECT b FROM Banner b WHERE b.isActive = true " +
            "AND (b.startAt IS NULL OR b.startAt <= :now) " +
            "AND (b.endAt IS NULL OR b.endAt >= :now) " +
            "ORDER BY b.displayOrder ASC, b.createdAt DESC")
    List<Banner> findActiveBanners(@Param("now") LocalDateTime now);

    // 관리자용: 전체 배너 조회
    Page<Banner> findAllByOrderByDisplayOrderAscCreatedAtDesc(Pageable pageable);
}
