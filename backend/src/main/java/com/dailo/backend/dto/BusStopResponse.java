package com.dailo.backend.dto;

import com.dailo.backend.entity.BusStop;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class BusStopResponse {

    private String stopId;
    private String stopName;
    private Double latitude;
    private Double longitude;

    public static BusStopResponse from(BusStop stop) {
        return BusStopResponse.builder()
                .stopId(stop.getStopId())
                .stopName(stop.getStopName())
                .latitude(stop.getLatitude())
                .longitude(stop.getLongitude())
                .build();
    }
}
