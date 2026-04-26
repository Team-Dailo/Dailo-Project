package com.dailo.backend.service;

import com.dailo.backend.dto.BusArrivalResponse;
import com.dailo.backend.dto.BusLocationResponse;
import com.dailo.backend.dto.BusRouteInfoResponse;
import com.dailo.backend.dto.BusRouteStopResponse;
import com.dailo.backend.dto.BusStopResponse;
import com.dailo.backend.entity.BusStop;
import com.dailo.backend.repository.BusStopRepository;
import com.dailo.backend.repository.BusStopRouteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BusService {

    // 충주시 도시코드 (TAGO 기준)
    private static final String DEFAULT_CITY_CODE = "33020";

    private final BusStopRepository busStopRepository;
    private final BusStopRouteRepository busStopRouteRepository;
    private final BusApiService busApiService;

    // @Cacheable 메서드 간 호출 시 프록시를 통해야 캐시가 동작하므로 자기주입 사용
    @Lazy
    @Autowired
    private BusService self;

    /**
     * 반경 내 정류장 목록 (DB 조회)
     */
    public List<BusStopResponse> getNearbyStops(double lat, double lng, int radiusM) {
        double latDelta = radiusM / 111000.0;
        double lngDelta = radiusM / (111000.0 * Math.cos(Math.toRadians(lat)));

        return busStopRepository.findByBounds(
                lat - latDelta, lat + latDelta,
                lng - lngDelta, lng + lngDelta,
                PageRequest.of(0, 15)
        ).stream().map(BusStopResponse::from).collect(Collectors.toList());
    }

    /**
     * 지도 bounds 내 정류장 조회
     */
    public List<BusStopResponse> getStopsInBounds(double swLat, double swLng, double neLat, double neLng) {
        return busStopRepository.findByBounds(swLat, neLat, swLng, neLng, PageRequest.of(0, 200))
                .stream().map(BusStopResponse::from).collect(Collectors.toList());
    }

    /**
     * 정류장 도착 예정 조회 (30초 캐시)
     * TAGO 도착 API의 arrprevstationcnt를 GPS 실측 위치로 보정
     */
    @Cacheable(value = "busArrivals", key = "#stopId")
    public BusArrivalResponse getArrivals(String stopId) {
        BusStop stop = busStopRepository.findByStopId(stopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "STOP_NOT_FOUND"));
        String cityCode = stop.getCityCode() != null ? stop.getCityCode() : DEFAULT_CITY_CODE;

        List<BusArrivalResponse.ArrivalItem> items = busApiService.getArrivals(cityCode, stopId);
        List<BusArrivalResponse.ArrivalItem> corrected = items.parallelStream()
                .map(item -> correctRemainingStops(item, cityCode, stopId))
                .collect(Collectors.toList());

        return BusArrivalResponse.builder()
                .stopName(stop.getStopName())
                .cityCode(cityCode)
                .cachedAt(System.currentTimeMillis())
                .arrivals(corrected)
                .build();
    }

    /**
     * GPS 실시간 위치 기반으로 남은 정거장 수 보정
     * GPS 데이터가 없거나 현재 정류장을 노선에서 찾지 못하면 원래 값 유지
     */
    private BusArrivalResponse.ArrivalItem correctRemainingStops(
            BusArrivalResponse.ArrivalItem item, String cityCode, String stopId) {
        if (item.getRouteId() == null || item.getRouteId().isEmpty()) return item;
        try {
            BusLocationResponse locRes = self.getBusLocations(cityCode, item.getRouteId());
            if (locRes.getBuses().isEmpty()) return item;

            List<BusRouteStopResponse> routeStops = self.getRouteStops(cityCode, item.getRouteId());
            int currentNodeOrder = routeStops.stream()
                    .filter(s -> stopId.equals(s.getNodeId()))
                    .mapToInt(BusRouteStopResponse::getNodeOrder)
                    .findFirst()
                    .orElse(-1);
            if (currentNodeOrder < 0) return item;

            int closestNodeOrder = locRes.getBuses().stream()
                    .mapToInt(BusLocationResponse.BusLocation::getNodeOrder)
                    .filter(order -> order < currentNodeOrder)
                    .max()
                    .orElse(-1);
            if (closestNodeOrder < 0) return item;

            int correctedRemaining = currentNodeOrder - closestNodeOrder;

            // GPS 보정된 정거장 수 비율로 도착 시간도 재계산
            Integer correctedArrivalSec = item.getArrivalSec();
            Integer correctedArrivalMin = item.getArrivalMin();
            String correctedArrivalMessage = item.getArrivalMessage();

            int originalRemaining = item.getRemainingStops() != null ? item.getRemainingStops() : 0;
            if (originalRemaining > 0 && correctedArrivalSec != null) {
                correctedArrivalSec = (int) Math.round((double) correctedRemaining / originalRemaining * correctedArrivalSec);
                correctedArrivalMin = correctedArrivalSec / 60;
                correctedArrivalMessage = correctedArrivalMin <= 0 ? "곧 도착" : correctedArrivalMin + "분 후 도착";
            }

            return BusArrivalResponse.ArrivalItem.builder()
                    .routeId(item.getRouteId())
                    .routeNo(item.getRouteNo())
                    .destination(item.getDestination())
                    .arrivalSec(correctedArrivalSec)
                    .arrivalMin(correctedArrivalMin)
                    .arrivalMessage(correctedArrivalMessage)
                    .remainingStops(correctedRemaining)
                    .build();
        } catch (Exception e) {
            return item;
        }
    }

    /**
     * 정류장 경유 노선 목록 조회 (DB)
     */
    public List<BusRouteInfoResponse> getRoutesByStop(String stopId) {
        return busStopRouteRepository.findByStopId(stopId).stream()
                .map(r -> BusRouteInfoResponse.builder()
                        .routeId(r.getRouteId())
                        .routeNo(r.getRouteNo())
                        .endNodeName(r.getEndNodeName() != null ? r.getEndNodeName() : "")
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * 노선 경유 정류장 목록 조회 (30초 캐시)
     */
    @Cacheable(value = "busRouteStops", key = "#cityCode + '_' + #routeId")
    public List<BusRouteStopResponse> getRouteStops(String cityCode, String routeId) {
        return busApiService.getRouteStops(cityCode, routeId);
    }

    /**
     * 노선 실시간 버스 위치 조회 (30초 캐시)
     */
    @Cacheable(value = "busLocations", key = "#cityCode + '_' + #routeId")
    public BusLocationResponse getBusLocations(String cityCode, String routeId) {
        List<BusLocationResponse.BusLocation> buses = busApiService.getBusLocations(cityCode, routeId);
        return BusLocationResponse.builder()
                .routeId(routeId)
                .cachedAt(System.currentTimeMillis())
                .buses(buses)
                .build();
    }
}
