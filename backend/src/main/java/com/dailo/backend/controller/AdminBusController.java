package com.dailo.backend.controller;

import com.dailo.backend.service.BusStopSyncService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/bus")
@RequiredArgsConstructor
@Tag(name = "Admin Bus API", description = "버스 정류장 데이터 동기화 (관리자 전용)")
public class AdminBusController {

    private final BusStopSyncService busStopSyncService;

    @Operation(summary = "특정 도시 정류장 동기화", description = "cityCode를 지정해 해당 도시 정류장을 DB에 저장합니다.")
    @PostMapping("/stops/sync")
    public ResponseEntity<Map<String, Object>> syncStops(
            @RequestParam String cityCode,
            @RequestParam String cityName
    ) {
        int syncedCount = busStopSyncService.syncByCity(cityCode, cityName);
        return ResponseEntity.ok(Map.of("syncedCount", syncedCount, "cityCode", cityCode, "cityName", cityName));
    }

    @Operation(summary = "도시코드 목록 조회")
    @GetMapping("/cities")
    public ResponseEntity<Map<String, String>> getCities() throws Exception {
        return ResponseEntity.ok(busStopSyncService.getCityCodeMap());
    }
}
