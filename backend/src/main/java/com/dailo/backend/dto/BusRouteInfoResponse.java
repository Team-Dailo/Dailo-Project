package com.dailo.backend.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class BusRouteInfoResponse {
    private String routeId;
    private String routeNo;
    private String endNodeName;
}
