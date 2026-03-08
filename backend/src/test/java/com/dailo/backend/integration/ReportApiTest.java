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
class ReportApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MemberRepository memberRepository;

    private Member reporter;
    private Member targetUser;

    @BeforeEach
    void setUp() {
        reporter = memberRepository.save(Member.builder()
                .email("reporter@test.com")
                .nickname("Reporter")
                .role(Role.USER)
                .socialType(SocialType.LOCAL)
                .build());

        targetUser = memberRepository.save(Member.builder()
                .email("target@test.com")
                .nickname("TargetUser")
                .role(Role.USER)
                .socialType(SocialType.LOCAL)
                .build());

        setSecurityContext(reporter.getEmail());
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
    @DisplayName("POST /api/reports - 신고 생성")
    void createReport() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "targetType", "USER",
                "targetId", targetUser.getId(),
                "reason", "SPAM",
                "description", "스팸 사용자"
        ));

        // ReportController는 X-User-Id 헤더 사용
        mockMvc.perform(post("/api/reports")
                        .header("X-User-Id", reporter.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.reporterId").value(reporter.getId()))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @Order(2)
    @DisplayName("GET /api/reports/my - 내 신고 목록")
    void getMyReports() throws Exception {
        // 신고 생성
        String body = objectMapper.writeValueAsString(Map.of(
                "targetType", "USER",
                "targetId", targetUser.getId(),
                "reason", "ABUSE"
        ));
        mockMvc.perform(post("/api/reports")
                .header("X-User-Id", reporter.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));

        mockMvc.perform(get("/api/reports/my")
                        .header("X-User-Id", reporter.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }
}
