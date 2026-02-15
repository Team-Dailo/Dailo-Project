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
class ReportApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @Order(1)
    @DisplayName("POST /api/reports - 신고 생성")
    void createReport() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "targetType", "POST",
                "targetId", 1,
                "reason", "SPAM",
                "description", "광고 게시글"
        ));

        mockMvc.perform(post("/api/reports")
                        .header("X-User-Id", "1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.reporterId").value(1))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @Order(2)
    @DisplayName("GET /api/reports/my - 내 신고 목록")
    void getMyReports() throws Exception {
        // 신고 생성 (POST 타입은 실제 게시글 ID 필요하므로 USER 타입 사용)
        String body = objectMapper.writeValueAsString(Map.of(
                "targetType", "USER",
                "targetId", 99,
                "reason", "ABUSE"
        ));
        mockMvc.perform(post("/api/reports")
                .header("X-User-Id", "2")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));

        mockMvc.perform(get("/api/reports/my")
                        .header("X-User-Id", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }
}
