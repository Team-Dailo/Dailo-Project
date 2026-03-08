package com.dailo.backend.integration;

import com.dailo.backend.domain.enums.Role;
import com.dailo.backend.domain.enums.SocialType;
import com.dailo.backend.entity.Member;
import com.dailo.backend.repository.MemberRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@Transactional
class BlockApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MemberRepository memberRepository;

    private Member blocker;
    private Member blocked;

    @BeforeEach
    void setUp() {
        blocker = memberRepository.save(Member.builder()
                .email("blocker@test.com")
                .nickname("Blocker")
                .role(Role.USER)
                .socialType(SocialType.LOCAL)
                .build());

        blocked = memberRepository.save(Member.builder()
                .email("blocked@test.com")
                .nickname("Blocked")
                .role(Role.USER)
                .socialType(SocialType.LOCAL)
                .build());

        setSecurityContext(blocker.getEmail());
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void setSecurityContext(String email) {
        UserDetails userDetails = User.builder()
                .username(email)
                .password("")
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_USER")))
                .build();

        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    @Order(1)
    @DisplayName("POST /api/blocks - 차단 추가")
    void blockUser() throws Exception {
        String body = objectMapper.writeValueAsString(
                Map.of("blockedId", blocked.getId())
        );

        mockMvc.perform(post("/api/blocks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.blockerId").value(blocker.getId()))
                .andExpect(jsonPath("$.blockedId").value(blocked.getId()));
    }

    @Test
    @Order(2)
    @DisplayName("POST /api/blocks - 자기 자신 차단 불가")
    void blockSelfNotAllowed() throws Exception {
        String body = objectMapper.writeValueAsString(
                Map.of("blockedId", blocker.getId())
        );

        mockMvc.perform(post("/api/blocks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(3)
    @DisplayName("POST /api/blocks - 중복 차단 방지")
    void duplicateBlockNotAllowed() throws Exception {
        String body = objectMapper.writeValueAsString(
                Map.of("blockedId", blocked.getId())
        );

        // 첫 번째 차단
        mockMvc.perform(post("/api/blocks")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isCreated());

        // 중복 차단 시도
        mockMvc.perform(post("/api/blocks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict());
    }

    @Test
    @Order(4)
    @DisplayName("GET /api/blocks/me - 내 차단 목록")
    void getMyBlocks() throws Exception {
        // 차단 추가
        String body = objectMapper.writeValueAsString(
                Map.of("blockedId", blocked.getId())
        );
        mockMvc.perform(post("/api/blocks")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));

        mockMvc.perform(get("/api/blocks/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @Order(5)
    @DisplayName("GET /api/blocks/check/{userId} - 차단 여부 확인")
    void checkBlock() throws Exception {
        mockMvc.perform(get("/api/blocks/check/" + blocked.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.blocked").exists());
    }

    @Test
    @Order(6)
    @DisplayName("DELETE /api/blocks/{blockedId} - 차단 해제")
    void unblockUser() throws Exception {
        // 차단 추가
        String body = objectMapper.writeValueAsString(
                Map.of("blockedId", blocked.getId())
        );
        mockMvc.perform(post("/api/blocks")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));

        // 차단 해제
        mockMvc.perform(delete("/api/blocks/" + blocked.getId()))
                .andExpect(status().isOk());
    }
}
