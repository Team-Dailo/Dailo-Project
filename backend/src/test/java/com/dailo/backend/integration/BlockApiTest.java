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
class BlockApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @Order(1)
    @DisplayName("POST /api/blocks - 차단 추가")
    void blockUser() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("blockedId", 100));

        mockMvc.perform(post("/api/blocks")
                        .header("X-User-Id", "10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.blockerId").value(10))
                .andExpect(jsonPath("$.blockedId").value(100));
    }

    @Test
    @Order(2)
    @DisplayName("POST /api/blocks - 자기 자신 차단 불가")
    void blockSelfNotAllowed() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("blockedId", 10));

        mockMvc.perform(post("/api/blocks")
                        .header("X-User-Id", "10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(3)
    @DisplayName("POST /api/blocks - 중복 차단 방지")
    void duplicateBlockNotAllowed() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of("blockedId", 200));

        // 첫 번째 차단
        mockMvc.perform(post("/api/blocks")
                .header("X-User-Id", "20")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));

        // 중복 차단 시도
        mockMvc.perform(post("/api/blocks")
                        .header("X-User-Id", "20")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict());
    }

    @Test
    @Order(4)
    @DisplayName("GET /api/blocks/me - 내 차단 목록")
    void getMyBlocks() throws Exception {
        // 차단 추가
        String body = objectMapper.writeValueAsString(Map.of("blockedId", 300));
        mockMvc.perform(post("/api/blocks")
                .header("X-User-Id", "30")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));

        mockMvc.perform(get("/api/blocks/me")
                        .header("X-User-Id", "30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(5)
    @DisplayName("GET /api/blocks/check/{userId} - 차단 여부 확인")
    void checkBlock() throws Exception {
        mockMvc.perform(get("/api/blocks/check/100")
                        .header("X-User-Id", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.blocked").exists());
    }

    @Test
    @Order(6)
    @DisplayName("DELETE /api/blocks/{blockedId} - 차단 해제")
    void unblockUser() throws Exception {
        // 차단 추가
        String body = objectMapper.writeValueAsString(Map.of("blockedId", 400));
        mockMvc.perform(post("/api/blocks")
                .header("X-User-Id", "40")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));

        // 차단 해제
        mockMvc.perform(delete("/api/blocks/400")
                        .header("X-User-Id", "40"))
                .andExpect(status().isOk());
    }

    @Test
    @Order(7)
    @DisplayName("상호 미노출 - 차단 시 게시글 필터링")
    void blockFilterOnPosts() throws Exception {
        // 사용자 50이 게시글 작성
        String postBody = objectMapper.writeValueAsString(Map.of(
                "title", "차단 필터 테스트",
                "content", "내용",
                "categoryType", "FREE"
        ));
        mockMvc.perform(post("/api/posts")
                .header("X-User-Id", "50")
                .contentType(MediaType.APPLICATION_JSON)
                .content(postBody));

        // 사용자 60이 사용자 50 차단
        String blockBody = objectMapper.writeValueAsString(Map.of("blockedId", 50));
        mockMvc.perform(post("/api/blocks")
                .header("X-User-Id", "60")
                .contentType(MediaType.APPLICATION_JSON)
                .content(blockBody));

        // 사용자 60이 게시글 목록 조회 → 사용자 50 글 안 보임
        mockMvc.perform(get("/api/posts")
                        .header("X-User-Id", "60"))
                .andExpect(status().isOk());
    }
}
