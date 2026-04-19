package com.dailo.backend.repository;

import com.dailo.backend.entity.BusStop;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BusStopRepository extends JpaRepository<BusStop, Long> {

    Optional<BusStop> findByStopId(String stopId);

    boolean existsByStopId(String stopId);

    @Query("SELECT b FROM BusStop b WHERE " +
            "b.latitude BETWEEN :minLat AND :maxLat AND " +
            "b.longitude BETWEEN :minLng AND :maxLng")
    List<BusStop> findByBounds(
            @Param("minLat") double minLat,
            @Param("maxLat") double maxLat,
            @Param("minLng") double minLng,
            @Param("maxLng") double maxLng,
            Pageable pageable
    );
}
