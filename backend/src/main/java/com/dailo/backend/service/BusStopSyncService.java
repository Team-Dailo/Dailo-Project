package com.dailo.backend.service;

import com.dailo.backend.entity.BusStop;
import com.dailo.backend.repository.BusStopRepository;
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
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class BusStopSyncService {

    @Value("${bus.api.key-encoded}")
    private String apiKey;

    @Value("${bus.api.base-url}")
    private String baseUrl;

    private final BusStopRepository busStopRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private static final int PER_PAGE = 100;

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
                    if (busStopRepository.existsByStopId(stopId)) continue;

                    try {
                        toSave.add(BusStop.builder()
                                .stopId(stopId)
                                .stopName(item.path("nodenm").asText())
                                .latitude(item.path("gpslati").asDouble())
                                .longitude(item.path("gpslong").asDouble())
                                .regionName(cityName)
                                .cityCode(cityCode)
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
