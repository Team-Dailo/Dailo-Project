package com.dailo.backend.service;

import com.dailo.backend.dto.BusArrivalResponse;
import com.dailo.backend.dto.BusLocationResponse;
import com.dailo.backend.dto.BusRouteInfoResponse;
import com.dailo.backend.dto.BusRouteStopResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class BusApiService {

    @Value("${bus.api.key-encoded}")
    private String apiKey;

    @Value("${bus.api.base-url}")
    private String baseUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    /**
     * 정류장 도착 예정 정보 조회
     * ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList
     */
    public List<BusArrivalResponse.ArrivalItem> getArrivals(String cityCode, String stopId) {
        URI uri = UriComponentsBuilder
                .fromHttpUrl(baseUrl + "/ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList")
                .queryParam("serviceKey", apiKey)
                .queryParam("cityCode", cityCode)
                .queryParam("nodeId", stopId)
                .queryParam("numOfRows", 20)
                .queryParam("pageNo", 1)
                .queryParam("_type", "json")
                .build(true)
                .toUri();

        try {
            String response = restTemplate.getForObject(uri, String.class);
            return parseArrivals(response);
        } catch (Exception e) {
            log.warn("버스 도착정보 API 호출 실패 - stopId: {}", stopId);
            throw upstreamFailure();
        }
    }

    private List<BusArrivalResponse.ArrivalItem> parseArrivals(String json) {
        List<BusArrivalResponse.ArrivalItem> result = new ArrayList<>();
        try {
            JsonNode items = readBody(json).path("items").path("item");

            if (items.isMissingNode() || items.isNull()) return result;

            Iterable<JsonNode> rows = items.isArray() ? items : List.of(items);
            for (JsonNode item : rows) {
                result.add(toArrivalItem(item));
            }
        } catch (Exception e) {
            log.warn("버스 도착정보 응답 형식 오류");
            throw upstreamFailure();
        }
        return result;
    }

    private BusArrivalResponse.ArrivalItem toArrivalItem(JsonNode item) {
        int arrivalSec = item.path("arrtime").asInt(-1);
        Integer arrivalMin = null;
        String arrivalMessage;

        if (arrivalSec >= 0) {
            arrivalMin = arrivalSec / 60;
            arrivalMessage = arrivalMin <= 0 ? "곧 도착" : arrivalMin + "분 후 도착";
        } else {
            arrivalMessage = "운행 정보 없음";
        }

        int remainingStops = item.path("arrprevstationcnt").asInt(-1);

        return BusArrivalResponse.ArrivalItem.builder()
                .routeId(item.path("routeid").asText(""))
                .routeNo(item.path("routeno").asText(""))
                .destination(item.path("nodenm").asText("")) // 현재 버스 위치 정류장명 (행선지 방면 표시용)
                .arrivalSec(arrivalSec >= 0 ? arrivalSec : null)
                .arrivalMin(arrivalMin)
                .arrivalMessage(arrivalMessage)
                .remainingStops(remainingStops >= 0 ? remainingStops : null)
                .build();
    }

    /**
     * 도시 전체 노선 목록 조회 (routeId + routeNo)
     * BusRouteInfoInqireService/getRouteNoList
     */
    public List<BusRouteInfoResponse> getRoutes(String cityCode) {
        List<BusRouteInfoResponse> result = new ArrayList<>();
        int page = 1;
        final int perPage = 100;

        while (true) {
            URI uri = UriComponentsBuilder
                    .fromHttpUrl(baseUrl + "/BusRouteInfoInqireService/getRouteNoList")
                    .queryParam("serviceKey", apiKey)
                    .queryParam("cityCode", cityCode)
                    .queryParam("numOfRows", perPage)
                    .queryParam("pageNo", page)
                    .queryParam("_type", "json")
                    .build(true).toUri();

            try {
                String response = restTemplate.getForObject(uri, String.class);
                JsonNode body = readBody(response);
                JsonNode items = body.path("items").path("item");

                if (items.isMissingNode() || items.isNull()) break;

                Iterable<JsonNode> rows = items.isArray() ? items : List.of(items);
                for (JsonNode item : rows) {
                    String routeId = item.path("routeid").asText("");
                    if (!routeId.isEmpty()) {
                        result.add(BusRouteInfoResponse.builder()
                                .routeId(routeId)
                                .routeNo(item.path("routeno").asText(""))
                                .endNodeName(item.path("endnodenm").asText(""))
                                .build());
                    }
                }

                int totalCount = body.path("totalCount").asInt(0);
                if ((long) page * perPage >= totalCount) break;
                page++;
            } catch (Exception e) {
                log.warn("노선 목록 조회 실패 - cityCode: {}", cityCode);
                throw upstreamFailure();
            }
        }

        return result;
    }

    /**
     * 노선 경유 정류장 목록 조회
     * BusRouteInfoInqireService/getRouteAcctoThrghSttnList
     */
    public List<BusRouteStopResponse> getRouteStops(String cityCode, String routeId) {
        List<BusRouteStopResponse> result = new ArrayList<>();
        int page = 1;
        final int perPage = 100;

        while (true) {
            URI uri = UriComponentsBuilder
                    .fromHttpUrl(baseUrl + "/BusRouteInfoInqireService/getRouteAcctoThrghSttnList")
                    .queryParam("serviceKey", apiKey)
                    .queryParam("cityCode", cityCode)
                    .queryParam("routeId", routeId)
                    .queryParam("numOfRows", perPage)
                    .queryParam("pageNo", page)
                    .queryParam("_type", "json")
                    .build(true)
                    .toUri();

            try {
                String response = restTemplate.getForObject(uri, String.class);
                JsonNode body = readBody(response);
                JsonNode items = body.path("items").path("item");

                if (items.isMissingNode() || items.isNull()) break;

                Iterable<JsonNode> rows = items.isArray() ? items : List.of(items);
                for (JsonNode item : rows) {
                    result.add(BusRouteStopResponse.builder()
                            .nodeId(item.path("nodeid").asText(""))
                            .nodeName(item.path("nodenm").asText(""))
                            .latitude(item.path("gpslati").asDouble())
                            .longitude(item.path("gpslong").asDouble())
                            .nodeOrder(item.path("nodeord").asInt(0))
                            .build());
                }

                int totalCount = body.path("totalCount").asInt(0);
                if ((long) page * perPage >= totalCount) break;
                page++;
            } catch (Exception e) {
                log.warn("노선 정류장 조회 실패 - routeId: {}", routeId);
                throw upstreamFailure();
            }
        }

        result.sort(java.util.Comparator.comparingInt(BusRouteStopResponse::getNodeOrder));
        return result;
    }

    /**
     * 노선 실시간 버스 위치 조회
     * BusLcInfoInqireService/getRouteAcctoBusLcList
     */
    public List<BusLocationResponse.BusLocation> getBusLocations(String cityCode, String routeId) {
        URI uri = UriComponentsBuilder
                .fromHttpUrl(baseUrl + "/BusLcInfoInqireService/getRouteAcctoBusLcList")
                .queryParam("serviceKey", apiKey)
                .queryParam("cityCode", cityCode)
                .queryParam("routeId", routeId)
                .queryParam("numOfRows", 50)
                .queryParam("pageNo", 1)
                .queryParam("_type", "json")
                .build(true)
                .toUri();

        List<BusLocationResponse.BusLocation> result = new ArrayList<>();
        try {
            String response = restTemplate.getForObject(uri, String.class);
            JsonNode items = readBody(response).path("items").path("item");

            if (items.isMissingNode() || items.isNull()) return result;

            Iterable<JsonNode> rows = items.isArray() ? items : List.of(items);
            for (JsonNode item : rows) {
                result.add(BusLocationResponse.BusLocation.builder()
                        .vehicleNo(item.path("vehicleno").asText(""))
                        .nodeOrder(item.path("nodeord").asInt(0))
                        .nodeName(item.path("nodenm").asText(""))
                        .latitude(item.path("gpslati").asDouble())
                        .longitude(item.path("gpslong").asDouble())
                        .build());
            }
        } catch (Exception e) {
            log.warn("버스 위치 조회 실패 - routeId: {}", routeId);
            throw upstreamFailure();
        }
        return result;
    }
    private JsonNode readBody(String json) throws Exception {
        JsonNode response = objectMapper.readTree(json).path("response");
        if (!"00".equals(response.path("header").path("resultCode").asText())) {
            throw upstreamFailure();
        }
        JsonNode body = response.path("body");
        if (!body.isObject()) throw upstreamFailure();
        JsonNode item = body.path("items").path("item");
        if (item.isMissingNode() || item.isNull()) {
            if (body.path("totalCount").asInt(-1) != 0) throw upstreamFailure();
        } else if (!item.isArray() && !item.isObject()) {
            throw upstreamFailure();
        } else if (item.isObject() && item.isEmpty()) {
            throw upstreamFailure();
        } else if (item.isEmpty() && body.path("totalCount").asInt(-1) != 0) {
            throw upstreamFailure();
        }
        return body;
    }

    private ResponseStatusException upstreamFailure() {
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY, "BUS_API_UNAVAILABLE");
    }
}
