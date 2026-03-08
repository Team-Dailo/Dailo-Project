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
class PostApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MemberRepository memberRepository;

    private Member testUser;

    @BeforeEach
    void setUp() {
        testUser = memberRepository.save(Member.builder()
                .email("posttest@test.com")
                .nickname("PostTester")
                .role(Role.USER)
                .socialType(SocialType.LOCAL)
                .build());

        setSecurityContext(testUser.getEmail());
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
    @DisplayName("POST /api/posts - 게시글 생성")
    void createPost() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "title", "테스트 게시글",
                "content", "테스트 내용입니다",
                "categoryType", "FREE"
        ));

        mockMvc.perform(post("/api/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.title").value("테스트 게시글"))
                .andExpect(jsonPath("$.authorId").value(testUser.getId()));
    }

    @Test
    @Order(2)
    @DisplayName("GET /api/posts - 게시글 목록 조회")
    void getAllPosts() throws Exception {
        // 먼저 게시글 생성
        String body = objectMapper.writeValueAsString(Map.of(
                "title", "목록 테스트 글",
                "content", "내용",
                "categoryType", "FREE"
        ));
        mockMvc.perform(post("/api/posts")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));

        mockMvc.perform(get("/api/posts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }

    @Test
    @Order(3)
    @DisplayName("GET /api/posts/{id} - 게시글 단건 조회")
    void getPostById() throws Exception {
        // 게시글 생성
        String body = objectMapper.writeValueAsString(Map.of(
                "title", "단건 조회 테스트",
                "content", "내용",
                "categoryType", "FREE"
        ));
        String response = mockMvc.perform(post("/api/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andReturn().getResponse().getContentAsString();

        Long postId = objectMapper.readTree(response).get("id").asLong();

        mockMvc.perform(get("/api/posts/" + postId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("단건 조회 테스트"));
    }

    @Test
    @Order(4)
    @DisplayName("PUT /api/posts/{id} - 게시글 수정")
    void updatePost() throws Exception {
        // 게시글 생성
        String createBody = objectMapper.writeValueAsString(Map.of(
                "title", "수정 전",
                "content", "내용",
                "categoryType", "FREE"
        ));
        String response = mockMvc.perform(post("/api/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(createBody))
                .andReturn().getResponse().getContentAsString();

        Long postId = objectMapper.readTree(response).get("id").asLong();

        // 수정
        String updateBody = objectMapper.writeValueAsString(Map.of(
                "title", "수정 후",
                "content", "수정된 내용",
                "categoryType", "FREE"
        ));
        mockMvc.perform(put("/api/posts/" + postId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("수정 후"));
    }

    @Test
    @Order(5)
    @DisplayName("DELETE /api/posts/{id} - 게시글 삭제")
    void deletePost() throws Exception {
        // 게시글 생성
        String body = objectMapper.writeValueAsString(Map.of(
                "title", "삭제 테스트",
                "content", "내용",
                "categoryType", "FREE"
        ));
        String response = mockMvc.perform(post("/api/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andReturn().getResponse().getContentAsString();

        Long postId = objectMapper.readTree(response).get("id").asLong();

        mockMvc.perform(delete("/api/posts/" + postId))
                .andExpect(status().isNoContent());
    }
}
