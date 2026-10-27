package com.dailo.backend.service;

import com.dailo.backend.controller.BusController;
import com.dailo.backend.entity.BusStop;
import com.dailo.backend.repository.BusStopRepository;
import com.dailo.backend.repository.BusStopRouteRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.ResourceAccessException;
import java.net.URI;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Actual controller/service/parser; only external HTTP and DB are mocked. */
class BusArrivalEndpointTest {
    private RestTemplate http;
    private MockMvc mvc;
    @BeforeEach void setup() {
        http = mock(RestTemplate.class);
        var api = new BusApiService(http, new ObjectMapper());
        ReflectionTestUtils.setField(api,"baseUrl","https://example.test");
        ReflectionTestUtils.setField(api,"apiKey","test");
        var stops = mock(BusStopRepository.class);
        when(stops.findByStopId("s")).thenReturn(Optional.of(BusStop.builder().stopId("s").stopName("Test stop").cityCode("1").build()));
        var service = new BusService(stops,mock(BusStopRouteRepository.class),api);
        mvc = MockMvcBuilders.standaloneSetup(new BusController(service)).build();
    }
    private void response(String body) {
        when(http.getForObject(any(URI.class),eq(String.class))).thenReturn(body);
    }
    @Test void normalResponsePreservesArrivalTimeAndStops() throws Exception {
        response("{\"response\":{\"header\":{\"resultCode\":\"00\"},\"body\":{\"totalCount\":1,\"items\":{\"item\":{\"routeid\":\"r\",\"routeno\":\"100\",\"arrtime\":600,\"arrprevstationcnt\":5}}}}}");
        mvc.perform(get("/api/bus/stops/s/arrivals")).andExpect(status().isOk())
            .andExpect(jsonPath("$.arrivals[0].arrivalSec").value(600))
            .andExpect(jsonPath("$.arrivals[0].arrivalMin").value(10))
            .andExpect(jsonPath("$.arrivals[0].remainingStops").value(5));
        verify(http,times(1)).getForObject(any(URI.class),eq(String.class));
    }
    @Test void noArrivalsIsSuccessfulEmptyList() throws Exception {
        response("{\"response\":{\"header\":{\"resultCode\":\"00\"},\"body\":{\"totalCount\":0,\"items\":\"\"}}}");
        mvc.perform(get("/api/bus/stops/s/arrivals")).andExpect(status().isOk()).andExpect(jsonPath("$.arrivals").isEmpty());
    }
    @Test void providerErrorIs502InsteadOfEmptyList() throws Exception {
        response("{\"response\":{\"header\":{\"resultCode\":\"30\",\"resultMsg\":\"ERROR\"}}}");
        mvc.perform(get("/api/bus/stops/s/arrivals")).andExpect(status().isBadGateway());
    }
    @Test void timeoutIs502AndFollowingRequestCanRecover() throws Exception {
        when(http.getForObject(any(URI.class),eq(String.class))).thenThrow(new ResourceAccessException("timeout"));
        mvc.perform(get("/api/bus/stops/s/arrivals")).andExpect(status().isBadGateway());
        reset(http);
        noArrivalsIsSuccessfulEmptyList();
    }
}
