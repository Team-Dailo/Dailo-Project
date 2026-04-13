package com.dailo.backend.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class BusRouteStopResponse {
    private String nodeId;
    private String nodeName;
    private double latitude;
    private double longitude;
    private int nodeOrder;
}
