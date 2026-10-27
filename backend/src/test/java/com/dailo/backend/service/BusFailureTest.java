package com.dailo.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.dailo.backend.entity.BusStop;
import com.dailo.backend.dto.BusArrivalResponse;
import com.dailo.backend.repository.BusStopRepository;
import com.dailo.backend.repository.BusStopRouteRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;
import java.util.List;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class BusFailureTest {
    private final RestTemplate http = mock(RestTemplate.class);
    private BusApiService api(String response) {
        BusApiService api = new BusApiService(http, new ObjectMapper());
        ReflectionTestUtils.setField(api, "baseUrl", "https://example.test");
        ReflectionTestUtils.setField(api, "apiKey", "test");
        when(http.getForObject(any(URI.class), eq(String.class))).thenReturn(response);
        return api;
    }
    @Test void successfulEmptyResponseIsNotAnError() {
        assertThat(api("{\"response\":{\"header\":{\"resultCode\":\"00\"},\"body\":{\"totalCount\":0,\"items\":\"\"}}}").getArrivals("1", "s")).isEmpty();
    }
    @ParameterizedTest
    @ValueSource(strings={"not-json", "{}", "{\"response\":{\"header\":{\"resultCode\":\"30\"}}}", "{\"response\":{\"header\":{\"resultCode\":\"00\"},\"body\":{\"totalCount\":2}}}"})
    void invalidResponseMustNotBecomeEmptySuccess(String response) {
        assertThatThrownBy(() -> api(response).getArrivals("1", "s"))
            .isInstanceOfSatisfying(ResponseStatusException.class, e -> assertThat(e.getStatusCode().value()).isEqualTo(502));
    }
    @Test void failedSecondRoutePageDoesNotReturnPartialData() {
        BusApiService api = api("{}");
        when(http.getForObject(any(URI.class), eq(String.class))).thenReturn(
            "{\"response\":{\"header\":{\"resultCode\":\"00\"},\"body\":{\"totalCount\":101,\"items\":{\"item\":{\"nodeid\":\"s\",\"nodeord\":1}}}}}", "{}");
        assertThatThrownBy(() -> api.getRouteStops("1", "r")).isInstanceOf(ResponseStatusException.class);
        verify(http,times(2)).getForObject(any(URI.class),eq(String.class));
    }
    @Test void locationFailureIsNotEmptySuccess() {
        assertThatThrownBy(() -> api("{}").getBusLocations("1", "r")).isInstanceOf(ResponseStatusException.class);
    }
    @Test void arrivalUsesOriginalEstimateWithoutLocationRequests() {
        BusStopRepository stops = mock(BusStopRepository.class);
        BusApiService api = mock(BusApiService.class);
        when(stops.findByStopId("s")).thenReturn(Optional.of(BusStop.builder().stopId("s").stopName("Stop").cityCode("1").build()));
        var item = BusArrivalResponse.ArrivalItem.builder().routeId("r").arrivalSec(600).arrivalMin(10).remainingStops(5).build();
        when(api.getArrivals("1","s")).thenReturn(List.of(item));
        var service = new BusService(stops,mock(BusStopRouteRepository.class),api);
        assertThat(service.getArrivals("s").getArrivals()).containsExactly(item);
        verify(api).getArrivals("1","s");
        verifyNoMoreInteractions(api);
    }
}
