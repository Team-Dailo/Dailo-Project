package com.dailo.backend.dto;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class BusArrivalResponse {

    private String stopName;
    private String cityCode;
    private Long cachedAt;
    private List<ArrivalItem> arrivals;

    @Getter
    @Builder
    public static class ArrivalItem {
        private String routeId;
        private String routeNo;
        private String destination;
        private Integer arrivalSec;
        private Integer arrivalMin;
        private String arrivalMessage;
        private Integer remainingStops;
    }
}
