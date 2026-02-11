package com.dailo.backend.dto.location;

public record LocationRequest(
        Long eventId,
        Double latitude,
        Double longitude
) {}