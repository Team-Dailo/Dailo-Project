package com.dailo.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class BusLocationResponse {

    private String routeId;
    private long cachedAt;
    private List<BusLocation> buses;

    @Getter
    @Builder
    public static class BusLocation {
        private String vehicleNo;
        private int nodeOrder;   // 현재 몇 번째 정류장 직후인지
        private String nodeName; // 가장 최근 지난 정류장명
        private double latitude;
        private double longitude;
    }
}
