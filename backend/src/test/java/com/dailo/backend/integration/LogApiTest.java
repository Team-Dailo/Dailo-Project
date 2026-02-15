package com.dailo.backend.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class LogApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    // ==================== Search Log ====================

    @Test
    @Order(1)
    @DisplayName("POST /api/logs/search - 검색 로그 기록")
    void logSearch() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "keyword", "콘서트",
                "filters", "{\"category\":\"MUSIC\"}",
                "resultCount", 15,
                "requestId", "req-001"
        ));

        mockMvc.perform(post("/api/logs/search")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.keyword").value("콘서트"))
                .andExpect(jsonPath("$.userId").value(1));
    }

    @Test
    @Order(2)
    @DisplayName("POST /api/logs/search - 비로그인 검색 로그")
    void logSearchWithoutLogin() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "keyword", "축제",
                "resultCount", 5
        ));

        mockMvc.perform(post("/api/logs/search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.userId").isEmpty());
    }

    @Test
    @Order(3)
    @DisplayName("POST /api/logs/search - keyword 길이 초과 시 400")
    void logSearchKeywordTooLong() throws Exception {
        String longKeyword = "a".repeat(101);
        String body = objectMapper.writeValueAsString(Map.of(
                "keyword", longKeyword
        ));

        mockMvc.perform(post("/api/logs/search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(4)
    @DisplayName("GET /api/logs/search/top - 인기 검색어")
    void getTopKeywords() throws Exception {
        mockMvc.perform(get("/api/logs/search/top?limit=5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // ==================== Click Log ====================

    @Test
    @Order(5)
    @DisplayName("POST /api/logs/click - 클릭 로그 기록")
    void logClick() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "eventId", 1,
                "source", "search",
                "requestId", "req-001"
        ));

        mockMvc.perform(post("/api/logs/click")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.eventId").value(1))
                .andExpect(jsonPath("$.source").value("search"));
    }

    @Test
    @Order(6)
    @DisplayName("GET /api/logs/click/count/{eventId} - 이벤트 클릭 수")
    void getClickCount() throws Exception {
        mockMvc.perform(get("/api/logs/click/count/1"))
                .andExpect(status().isOk());
    }

    @Test
    @Order(7)
    @DisplayName("GET /api/logs/click/top - 인기 이벤트")
    void getTopClickedEvents() throws Exception {
        mockMvc.perform(get("/api/logs/click/top?limit=5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}
