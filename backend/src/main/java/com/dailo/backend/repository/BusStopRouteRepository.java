package com.dailo.backend.repository;

import com.dailo.backend.entity.BusStopRoute;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BusStopRouteRepository extends JpaRepository<BusStopRoute, Long> {

    List<BusStopRoute> findByStopId(String stopId);

    @Modifying
    @Transactional
    @Query("DELETE FROM BusStopRoute r WHERE r.stopId IN :stopIds")
    void deleteByStopIdIn(@Param("stopIds") List<String> stopIds);
}
