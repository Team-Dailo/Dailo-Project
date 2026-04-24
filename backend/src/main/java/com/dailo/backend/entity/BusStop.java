package com.dailo.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "bus_stops", indexes = {
        @Index(name = "idx_bus_stop_location", columnList = "latitude, longitude")
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class BusStop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "stop_id", nullable = false, unique = true, length = 30)
    private String stopId;

    @Column(name = "stop_name", nullable = false, length = 100)
    private String stopName;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(name = "region_name", length = 50)
    private String regionName;

    @Column(name = "city_code", length = 10)
    private String cityCode;

    @Column(name = "has_routes")
    private Boolean hasRoutes;

    @UpdateTimestamp
    @Column(name = "synced_at")
    private LocalDateTime syncedAt;
}
