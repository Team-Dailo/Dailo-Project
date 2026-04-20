package com.dailo.backend.controller;

import com.dailo.backend.service.BusStopSyncService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/bus")
@RequiredArgsConstructor
@Tag(name = "Admin Bus API", description = "버스 정류장 데이터 동기화 (관리자 전용)")
public class AdminBusController {

    private final BusStopSyncService busStopSyncService;

    @Operation(summary = "특정 도시 정류장 동기화", description = "백그라운드에서 동기화를 시작하고 즉시 202를 반환합니다.")
    @PostMapping("/stops/sync")
    public ResponseEntity<Map<String, Object>> syncStops(
            @RequestParam String cityCode,
            @RequestParam String cityName
    ) {
        busStopSyncService.syncByCity(cityCode, cityName);
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(Map.of("message", "동기화 시작됨", "cityCode", cityCode, "cityName", cityName));
    }

    @Operation(summary = "도시코드 목록 조회")
    @GetMapping("/cities")
    public ResponseEntity<Map<String, String>> getCities() throws Exception {
        return ResponseEntity.ok(busStopSyncService.getCityCodeMap());
    }
}
