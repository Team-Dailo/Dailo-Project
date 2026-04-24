package com.dailo.backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "bus_stop_routes", indexes = {
        @Index(name = "idx_bus_stop_route_stop_id", columnList = "stop_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_bus_stop_route", columnNames = {"stop_id", "route_id"})
})
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class BusStopRoute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "stop_id", nullable = false, length = 30)
    private String stopId;

    @Column(name = "route_id", nullable = false, length = 30)
    private String routeId;

    @Column(name = "route_no", length = 20)
    private String routeNo;

    @Column(name = "end_node_name", length = 50)
    private String endNodeName;
}
