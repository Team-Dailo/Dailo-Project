package com.dailo.backend.controller;

import com.dailo.backend.dto.BusArrivalResponse;
import com.dailo.backend.dto.BusLocationResponse;
import com.dailo.backend.dto.BusRouteInfoResponse;
import com.dailo.backend.dto.BusRouteStopResponse;
import com.dailo.backend.dto.BusStopResponse;
import com.dailo.backend.service.BusService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bus")
@RequiredArgsConstructor
@Tag(name = "Bus API", description = "버스 정류장 및 도착 예정 정보 API")
public class BusController {

    private final BusService busService;

    @Operation(summary = "주변 정류장 조회", description = "지도 중심 좌표 기준 반경 내 버스 정류장 목록을 반환합니다.")
    @GetMapping("/stops/nearby")
    public ResponseEntity<List<BusStopResponse>> getNearbyStops(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "1000") int radius
    ) {
        return ResponseEntity.ok(busService.getNearbyStops(lat, lng, radius));
    }

    @Operation(summary = "지도 범위 내 정류장 조회", description = "현재 지도 화면 bounds 내 버스 정류장 목록을 반환합니다.")
    @GetMapping("/stops/bounds")
    public ResponseEntity<List<BusStopResponse>> getStopsInBounds(
            @RequestParam double swLat,
            @RequestParam double swLng,
            @RequestParam double neLat,
            @RequestParam double neLng
    ) {
        return ResponseEntity.ok(busService.getStopsInBounds(swLat, swLng, neLat, neLng));
    }

    @Operation(summary = "정류장 도착 예정 조회", description = "해당 정류장에 도착 예정인 버스 목록과 남은 시간을 반환합니다. (30초 캐시)")
    @GetMapping("/stops/{stopId}/arrivals")
    public ResponseEntity<BusArrivalResponse> getArrivals(
            @PathVariable String stopId
    ) {
        return ResponseEntity.ok(busService.getArrivals(stopId));
    }

    @Operation(summary = "정류장 경유 노선 목록 조회", description = "해당 정류장을 경유하는 모든 노선 목록을 반환합니다.")
    @GetMapping("/stops/{stopId}/routes")
    public ResponseEntity<List<BusRouteInfoResponse>> getRoutesByStop(
            @PathVariable String stopId
    ) {
        return ResponseEntity.ok(busService.getRoutesByStop(stopId));
    }

    @Operation(summary = "노선 경유 정류장 조회", description = "해당 노선의 모든 경유 정류장 목록을 순서대로 반환합니다.")
    @GetMapping("/routes/{routeId}/stops")
    public ResponseEntity<List<BusRouteStopResponse>> getRouteStops(
            @PathVariable String routeId,
            @RequestParam String cityCode
    ) {
        return ResponseEntity.ok(busService.getRouteStops(cityCode, routeId));
    }

    @Operation(summary = "노선 실시간 버스 위치 조회", description = "해당 노선의 현재 운행 중인 버스 위치 목록을 반환합니다. (30초 캐시)")
    @GetMapping("/routes/{routeId}/buses")
    public ResponseEntity<BusLocationResponse> getBusLocations(
            @PathVariable String routeId,
            @RequestParam String cityCode
    ) {
        return ResponseEntity.ok(busService.getBusLocations(cityCode, routeId));
    }
}
