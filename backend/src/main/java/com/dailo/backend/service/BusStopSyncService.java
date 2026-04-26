package com.dailo.backend.service;

import com.dailo.backend.dto.BusRouteInfoResponse;
import com.dailo.backend.dto.BusRouteStopResponse;
import com.dailo.backend.entity.BusStop;
import com.dailo.backend.entity.BusStopRoute;
import com.dailo.backend.repository.BusStopRepository;
import com.dailo.backend.repository.BusStopRouteRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class BusStopSyncService {

    @Value("${bus.api.key-encoded}")
    private String apiKey;

    @Value("${bus.api.base-url}")
    private String baseUrl;

    private final BusStopRepository busStopRepository;
    private final BusStopRouteRepository busStopRouteRepository;
    private final BusApiService busApiService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private static final int PER_PAGE = 100;

    /**
     * 노선 목록 → 경유 정류장 역방향으로 (stopId → List<route>) 매핑 구성 후 DB 저장
     * 동시에 노선 보유 정류장 ID Set 반환
     */
    private Set<String> buildAndSaveRouteMapping(String cityCode) {
        List<BusRouteInfoResponse> routes = busApiService.getRoutes(cityCode);
        log.info("노선 수: {}개 - cityCode: {}", routes.size(), cityCode);

        // (stopId, routeId) 중복 방지용 Set + stopId → list of BusStopRoute
        Map<String, List<BusStopRoute>> stopRouteMap = new HashMap<>();
        Set<String> seen = new HashSet<>(); // "stopId:routeId"

        for (BusRouteInfoResponse route : routes) {
            try {
                List<BusRouteStopResponse> stops = busApiService.getRouteStops(cityCode, route.getRouteId());
                for (BusRouteStopResponse stop : stops) {
                    String stopId = stop.getNodeId();
                    if (stopId == null || stopId.isEmpty()) continue;
                    String key = stopId + ":" + route.getRouteId();
                    if (!seen.add(key)) continue; // 이미 추가된 조합은 건너뜀
                    stopRouteMap.computeIfAbsent(stopId, k -> new ArrayList<>())
                            .add(BusStopRoute.builder()
                                    .stopId(stopId)
                                    .routeId(route.getRouteId())
                                    .routeNo(route.getRouteNo())
                                    .endNodeName(route.getEndNodeName())
                                    .build());
                }
            } catch (Exception e) {
                log.warn("노선 경유 정류장 조회 실패 - routeId: {}", route.getRouteId());
            }
        }

        Set<String> stopsWithRoutes = stopRouteMap.keySet();
        log.info("노선 보유 정류장 수: {}개", stopsWithRoutes.size());

        // 기존 데이터 삭제 후 새로 저장 (배치)
        List<String> stopIds = new ArrayList<>(stopsWithRoutes);
        for (int i = 0; i < stopIds.size(); i += 500) {
            List<String> batch = stopIds.subList(i, Math.min(i + 500, stopIds.size()));
            busStopRouteRepository.deleteByStopIdIn(batch);
        }

        List<BusStopRoute> allRoutes = new ArrayList<>();
        for (List<BusStopRoute> routeList : stopRouteMap.values()) {
            allRoutes.addAll(routeList);
        }
        for (int i = 0; i < allRoutes.size(); i += 500) {
            busStopRouteRepository.saveAll(allRoutes.subList(i, Math.min(i + 500, allRoutes.size())));
        }

        log.info("노선-정류장 매핑 저장 완료: {}건", allRoutes.size());
        return new HashSet<>(stopsWithRoutes);
    }

    /**
     * TAGO BusSttnInfoInqireService → 전체 도시코드 목록 조회
     */
    public Map<String, String> getCityCodeMap() throws Exception {
        URI uri = UriComponentsBuilder
                .fromHttpUrl(baseUrl + "/BusSttnInfoInqireService/getCtyCodeList")
                .queryParam("serviceKey", apiKey)
                .queryParam("numOfRows", 300)
                .queryParam("pageNo", 1)
                .queryParam("_type", "json")
                .build(true).toUri();

        String response = restTemplate.getForObject(uri, String.class);
        JsonNode items = objectMapper.readTree(response)
                .path("response").path("body").path("items").path("item");

        Map<String, String> cityCodeMap = new HashMap<>();
        if (items.isArray()) {
            for (JsonNode item : items) {
                String code = item.path("citycode").asText();
                String name = item.path("cityname").asText();
                cityCodeMap.put(code, name);
            }
        }
        return cityCodeMap;
    }

    /**
     * 특정 도시의 전체 버스 정류장 동기화 (비동기)
     */
    @Async
    public void syncByCity(String cityCode, String cityName) {
        log.info("노선 보유 정류장 목록 구성 시작 - {}", cityName);
        Set<String> stopsWithRoutes = buildAndSaveRouteMapping(cityCode);

        int page = 1;
        int totalSaved = 0;

        while (true) {
            URI uri = UriComponentsBuilder
                    .fromHttpUrl(baseUrl + "/BusSttnInfoInqireService/getSttnNoList")
                    .queryParam("serviceKey", apiKey)
                    .queryParam("cityCode", cityCode)
                    .queryParam("numOfRows", PER_PAGE)
                    .queryParam("pageNo", page)
                    .queryParam("_type", "json")
                    .build(true).toUri();

            try {
                String response = restTemplate.getForObject(uri, String.class);
                JsonNode body = objectMapper.readTree(response).path("response").path("body");
                JsonNode items = body.path("items").path("item");

                if (items.isMissingNode() || items.isNull()) break;

                List<BusStop> toSave = new ArrayList<>();
                Iterable<JsonNode> rows = items.isArray() ? items : List.of(items);

                for (JsonNode item : rows) {
                    String stopId = item.path("nodeid").asText();
                    boolean hasRoutes = stopsWithRoutes.contains(stopId);
                    boolean exists = busStopRepository.existsByStopId(stopId);

                    if (exists) {
                        busStopRepository.updateHasRoutes(stopId, hasRoutes);
                        continue;
                    }

                    if (!hasRoutes) continue;

                    try {
                        toSave.add(BusStop.builder()
                                .stopId(stopId)
                                .stopName(item.path("nodenm").asText())
                                .latitude(item.path("gpslati").asDouble())
                                .longitude(item.path("gpslong").asDouble())
                                .regionName(cityName)
                                .cityCode(cityCode)
                                .hasRoutes(true)
                                .build());
                    } catch (Exception e) {
                        log.warn("정류장 파싱 실패 - stopId: {}", stopId);
                    }
                }

                busStopRepository.saveAll(toSave);
                totalSaved += toSave.size();

                int totalCount = body.path("totalCount").asInt(0);
                if ((long) page * PER_PAGE >= totalCount) break;
                page++;

            } catch (Exception e) {
                log.error("정류장 동기화 실패 - cityCode: {}, page: {}, error: {}", cityCode, page, e.getMessage());
                break;
            }
        }

        log.info("정류장 동기화 완료 - {} ({}): {}건", cityName, cityCode, totalSaved);
    }

    /** 매일 새벽 3시 충주시 정류장 자동 동기화 */
    @Scheduled(cron = "0 0 3 * * *", zone = "Asia/Seoul")
    public void scheduledSync() {
        log.info("정류장 자동 동기화 시작 - 충주시");
        syncByCity("33020", "충주시");
    }
}
