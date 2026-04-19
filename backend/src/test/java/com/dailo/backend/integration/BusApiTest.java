package com.dailo.backend.integration;

import com.dailo.backend.dto.BusArrivalResponse;
import com.dailo.backend.dto.BusLocationResponse;
import com.dailo.backend.dto.BusRouteInfoResponse;
import com.dailo.backend.dto.BusRouteStopResponse;
import com.dailo.backend.entity.BusStop;
import com.dailo.backend.repository.BusStopRepository;
import com.dailo.backend.service.BusApiService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.cache.CacheManager;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.times;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@Transactional
class BusApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private BusStopRepository busStopRepository;

    @MockBean
    private BusApiService busApiService;

    @Autowired
    private CacheManager cacheManager;

    private static final String STOP_ID = "CJB0000001";
    private static final String STOP_NAME = "충주터미널";
    private static final String ROUTE_ID = "route001";
    private static final String CITY_CODE = "33020";

    @BeforeEach
    void setUp() {
        cacheManager.getCacheNames().forEach(name -> cacheManager.getCache(name).clear());
        busStopRepository.save(BusStop.builder()
                .stopId(STOP_ID)
                .stopName(STOP_NAME)
                .latitude(37.00)
                .longitude(127.00)
                .cityCode(CITY_CODE)
                .build());
    }

    // ────────────────────────────────────────────────
    // 정류장 조회
    // ────────────────────────────────────────────────

    @Test
    @DisplayName("GET /stops/bounds - bounds 내 정류장 반환")
    void getStopsInBounds_returnsStop() throws Exception {
        mockMvc.perform(get("/api/bus/stops/bounds")
                        .param("swLat", "36.99").param("swLng", "126.99")
                        .param("neLat", "37.01").param("neLng", "127.01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].stopId").value(STOP_ID))
                .andExpect(jsonPath("$[0].stopName").value(STOP_NAME));
    }

    @Test
    @DisplayName("GET /stops/bounds - bounds 밖이면 빈 배열")
    void getStopsInBounds_outOfBounds_returnsEmpty() throws Exception {
        mockMvc.perform(get("/api/bus/stops/bounds")
                        .param("swLat", "35.00").param("swLng", "125.00")
                        .param("neLat", "35.50").param("neLng", "125.50"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @DisplayName("GET /stops/nearby - 반경 내 정류장 반환")
    void getNearbyStops_returnsStop() throws Exception {
        mockMvc.perform(get("/api/bus/stops/nearby")
                        .param("lat", "37.00")
                        .param("lng", "127.00")
                        .param("radius", "500"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].stopId").value(STOP_ID));
    }

    @Test
    @DisplayName("GET /stops/nearby - 반경 밖이면 빈 배열")
    void getNearbyStops_outOfRadius_returnsEmpty() throws Exception {
        mockMvc.perform(get("/api/bus/stops/nearby")
                        .param("lat", "35.00")
                        .param("lng", "125.00")
                        .param("radius", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // ────────────────────────────────────────────────
    // 도착 예정 조회
    // ────────────────────────────────────────────────

    @Test
    @DisplayName("GET /stops/{stopId}/arrivals - GPS 보정 적용 (remainingStops = currentNodeOrder - busNodeOrder)")
    void getArrivals_withGpsCorrection_appliesRemainingStops() throws Exception {
        // 버스는 3번 정류장에 있고, 목적 정류장은 8번 → 보정 후 remainingStops = 5
        given(busApiService.getArrivals(anyString(), anyString()))
                .willReturn(List.of(arrivalItem(ROUTE_ID, "100", 5, 10)));
        given(busApiService.getBusLocations(anyString(), anyString()))
                .willReturn(List.of(busLocation("충주1234", 3)));
        given(busApiService.getRouteStops(anyString(), anyString()))
                .willReturn(List.of(routeStop(STOP_ID, 8)));

        mockMvc.perform(get("/api/bus/stops/{stopId}/arrivals", STOP_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stopName").value(STOP_NAME))
                .andExpect(jsonPath("$.arrivals[0].routeNo").value("100"))
                .andExpect(jsonPath("$.arrivals[0].remainingStops").value(5)); // 8 - 3
    }

    @Test
    @DisplayName("GET /stops/{stopId}/arrivals - 운행 중 버스 없으면 원래 remainingStops 유지")
    void getArrivals_noBusesOnRoute_keepsOriginalRemainingStops() throws Exception {
        given(busApiService.getArrivals(anyString(), anyString()))
                .willReturn(List.of(arrivalItem(ROUTE_ID, "100", 7, 10)));
        given(busApiService.getBusLocations(anyString(), anyString()))
                .willReturn(Collections.emptyList());
        given(busApiService.getRouteStops(anyString(), anyString()))
                .willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/bus/stops/{stopId}/arrivals", STOP_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.arrivals[0].remainingStops").value(7));
    }

    @Test
    @DisplayName("GET /stops/{stopId}/arrivals - 도착 예정 없으면 빈 배열")
    void getArrivals_noArrivals_returnsEmptyList() throws Exception {
        given(busApiService.getArrivals(anyString(), anyString()))
                .willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/bus/stops/{stopId}/arrivals", STOP_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.arrivals.length()").value(0));
    }

    @Test
    @DisplayName("GET /stops/{stopId}/arrivals - 존재하지 않는 정류장이면 404")
    void getArrivals_unknownStop_returns404() throws Exception {
        mockMvc.perform(get("/api/bus/stops/{stopId}/arrivals", "INVALID"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /stops/{stopId}/arrivals - 동일 정류장 2회 조회 시 외부 API는 1회만 호출 (캐시)")
    void getArrivals_secondCallIsCached() throws Exception {
        given(busApiService.getArrivals(anyString(), anyString()))
                .willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/bus/stops/{stopId}/arrivals", STOP_ID)).andExpect(status().isOk());
        mockMvc.perform(get("/api/bus/stops/{stopId}/arrivals", STOP_ID)).andExpect(status().isOk());

        then(busApiService).should(times(1)).getArrivals(anyString(), anyString());
    }

    // ────────────────────────────────────────────────
    // 노선 정보 조회
    // ────────────────────────────────────────────────

    @Test
    @DisplayName("GET /stops/{stopId}/routes - 경유 노선 목록 반환")
    void getRoutesByStop_returnsRoutes() throws Exception {
        given(busApiService.getRoutesByStop(anyString(), anyString()))
                .willReturn(List.of(
                        BusRouteInfoResponse.builder()
                                .routeId(ROUTE_ID).routeNo("100").endNodeName("종점")
                                .build()
                ));

        mockMvc.perform(get("/api/bus/stops/{stopId}/routes", STOP_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].routeId").value(ROUTE_ID))
                .andExpect(jsonPath("$[0].routeNo").value("100"))
                .andExpect(jsonPath("$[0].endNodeName").value("종점"));
    }

    @Test
    @DisplayName("GET /stops/{stopId}/routes - 존재하지 않는 정류장이면 404")
    void getRoutesByStop_unknownStop_returns404() throws Exception {
        mockMvc.perform(get("/api/bus/stops/{stopId}/routes", "INVALID"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("GET /routes/{routeId}/stops - 노선 경유 정류장 순서대로 반환")
    void getRouteStops_returnsOrderedStops() throws Exception {
        given(busApiService.getRouteStops(anyString(), anyString()))
                .willReturn(List.of(
                        routeStop("CJB0000001", 1),
                        routeStop("CJB0000002", 2)
                ));

        mockMvc.perform(get("/api/bus/routes/{routeId}/stops", ROUTE_ID)
                        .param("cityCode", CITY_CODE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].nodeId").value("CJB0000001"))
                .andExpect(jsonPath("$[0].nodeOrder").value(1))
                .andExpect(jsonPath("$[1].nodeOrder").value(2));
    }

    @Test
    @DisplayName("GET /routes/{routeId}/buses - 실시간 버스 위치 반환")
    void getBusLocations_returnsBuses() throws Exception {
        given(busApiService.getBusLocations(anyString(), anyString()))
                .willReturn(List.of(busLocation("충주1234", 3)));

        mockMvc.perform(get("/api/bus/routes/{routeId}/buses", ROUTE_ID)
                        .param("cityCode", CITY_CODE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.routeId").value(ROUTE_ID))
                .andExpect(jsonPath("$.buses[0].vehicleNo").value("충주1234"))
                .andExpect(jsonPath("$.buses[0].nodeOrder").value(3));
    }

    @Test
    @DisplayName("GET /routes/{routeId}/buses - 운행 중 버스 없으면 빈 배열")
    void getBusLocations_noBuses_returnsEmpty() throws Exception {
        given(busApiService.getBusLocations(anyString(), anyString()))
                .willReturn(Collections.emptyList());

        mockMvc.perform(get("/api/bus/routes/{routeId}/buses", ROUTE_ID)
                        .param("cityCode", CITY_CODE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.routeId").value(ROUTE_ID))
                .andExpect(jsonPath("$.buses.length()").value(0));
    }

    // ────────────────────────────────────────────────
    // 헬퍼 팩토리
    // ────────────────────────────────────────────────

    private BusArrivalResponse.ArrivalItem arrivalItem(
            String routeId, String routeNo, int remainingStops, int arrivalMin) {
        return BusArrivalResponse.ArrivalItem.builder()
                .routeId(routeId)
                .routeNo(routeNo)
                .destination("종점")
                .arrivalMin(arrivalMin)
                .arrivalMessage(arrivalMin + "분 후 도착")
                .remainingStops(remainingStops)
                .build();
    }

    private BusLocationResponse.BusLocation busLocation(String vehicleNo, int nodeOrder) {
        return BusLocationResponse.BusLocation.builder()
                .vehicleNo(vehicleNo)
                .nodeOrder(nodeOrder)
                .nodeName("정류장" + nodeOrder)
                .latitude(37.005)
                .longitude(127.005)
                .build();
    }

    private BusRouteStopResponse routeStop(String nodeId, int nodeOrder) {
        return BusRouteStopResponse.builder()
                .nodeId(nodeId)
                .nodeName("정류장" + nodeOrder)
                .latitude(37.00)
                .longitude(127.00)
                .nodeOrder(nodeOrder)
                .build();
    }
}
