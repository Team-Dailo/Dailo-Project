package com.dailo.backend.integration;

import com.dailo.backend.domain.enums.Role;
import com.dailo.backend.domain.enums.SocialType;
import com.dailo.backend.entity.Member;
import com.dailo.backend.repository.MemberRepository;
import com.dailo.backend.support.TestSecurityUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@Transactional
class CommentApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MemberRepository memberRepository;

    private Member user1;
    private Member user2;
    private Member user3;

    @BeforeEach
    void setUp() {
        user1 = memberRepository.save(Member.builder()
                .email("comment1@test.com")
                .nickname("Commenter1")
                .role(Role.USER)
                .socialType(SocialType.LOCAL)
                .build());

        user2 = memberRepository.save(Member.builder()
                .email("comment2@test.com")
                .nickname("Commenter2")
                .role(Role.USER)
                .socialType(SocialType.LOCAL)
                .build());

        user3 = memberRepository.save(Member.builder()
                .email("comment3@test.com")
                .nickname("Commenter3")
                .role(Role.USER)
                .socialType(SocialType.LOCAL)
                .build());

        TestSecurityUtils.authenticate(user1.getEmail());
    }

    @AfterEach
    void tearDown() {
        TestSecurityUtils.clearAuthentication();
    }

    private Long createPost() throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "title", "댓글 테스트 게시글",
                "content", "내용",
                "categoryType", "FREE"
        ));
        String response = mockMvc.perform(post("/api/posts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asLong();
    }

    @Test
    @Order(1)
    @DisplayName("POST /api/posts/{postId}/comments - 댓글 생성")
    void createComment() throws Exception {
        Long postId = createPost();

        String body = objectMapper.writeValueAsString(Map.of(
                "content", "테스트 댓글"
        ));

        mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.content").value("테스트 댓글"))
                .andExpect(jsonPath("$.postId").value(postId));
    }

    @Test
    @Order(2)
    @DisplayName("POST - 대댓글 생성 (1단계)")
    void createReply() throws Exception {
        Long postId = createPost();

        // 부모 댓글 생성
        String parentBody = objectMapper.writeValueAsString(Map.of("content", "부모 댓글"));
        String parentResponse = mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(parentBody))
                .andReturn().getResponse().getContentAsString();
        Long parentId = objectMapper.readTree(parentResponse).get("id").asLong();

        // user2로 전환하여 대댓글 생성
        TestSecurityUtils.authenticate(user2.getEmail());

        String replyBody = objectMapper.writeValueAsString(Map.of(
                "content", "대댓글입니다",
                "parentCommentId", parentId
        ));

        mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(replyBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("대댓글입니다"))
                .andExpect(jsonPath("$.parentCommentId").value(parentId));
    }

    @Test
    @Order(3)
    @DisplayName("POST - 대댓글의 대댓글 방지 (2단계 불가)")
    void nestedReplyNotAllowed() throws Exception {
        Long postId = createPost();

        // 부모 댓글
        String parentBody = objectMapper.writeValueAsString(Map.of("content", "1단계"));
        String parentResponse = mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(parentBody))
                .andReturn().getResponse().getContentAsString();
        Long parentId = objectMapper.readTree(parentResponse).get("id").asLong();

        // user2로 전환하여 대댓글
        TestSecurityUtils.authenticate(user2.getEmail());

        String replyBody = objectMapper.writeValueAsString(Map.of(
                "content", "2단계", "parentCommentId", parentId));
        String replyResponse = mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(replyBody))
                .andReturn().getResponse().getContentAsString();
        Long replyId = objectMapper.readTree(replyResponse).get("id").asLong();

        // user3로 전환하여 대댓글의 대댓글 → 실패
        TestSecurityUtils.authenticate(user3.getEmail());

        String nestedBody = objectMapper.writeValueAsString(Map.of(
                "content", "3단계 불가", "parentCommentId", replyId));

        mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(nestedBody))
                .andExpect(status().isBadRequest());
    }

    @Test
    @Order(4)
    @DisplayName("GET /api/posts/{postId}/comments - 댓글 목록 (대댓글 포함)")
    void getCommentsWithReplies() throws Exception {
        Long postId = createPost();

        // 댓글 + 대댓글 생성
        String parentBody = objectMapper.writeValueAsString(Map.of("content", "부모"));
        String parentResponse = mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(parentBody))
                .andReturn().getResponse().getContentAsString();
        Long parentId = objectMapper.readTree(parentResponse).get("id").asLong();

        // user2로 전환하여 대댓글
        TestSecurityUtils.authenticate(user2.getEmail());

        String replyBody = objectMapper.writeValueAsString(Map.of(
                "content", "자식", "parentCommentId", parentId));
        mockMvc.perform(post("/api/posts/" + postId + "/comments")
                .contentType(MediaType.APPLICATION_JSON)
                .content(replyBody));

        // 조회
        mockMvc.perform(get("/api/posts/" + postId + "/comments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].replies").isArray());
    }

    @Test
    @Order(5)
    @DisplayName("PUT /api/comments/{id} - 댓글 수정")
    void updateComment() throws Exception {
        Long postId = createPost();

        String body = objectMapper.writeValueAsString(Map.of("content", "수정 전"));
        String response = mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andReturn().getResponse().getContentAsString();
        Long commentId = objectMapper.readTree(response).get("id").asLong();

        String updateBody = objectMapper.writeValueAsString(Map.of("content", "수정 후"));
        mockMvc.perform(put("/api/comments/" + commentId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(updateBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").value("수정 후"));
    }

    @Test
    @Order(6)
    @DisplayName("DELETE /api/comments/{id} - 댓글 삭제")
    void deleteComment() throws Exception {
        Long postId = createPost();

        String body = objectMapper.writeValueAsString(Map.of("content", "삭제될 댓글"));
        String response = mockMvc.perform(post("/api/posts/" + postId + "/comments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andReturn().getResponse().getContentAsString();
        Long commentId = objectMapper.readTree(response).get("id").asLong();

        mockMvc.perform(delete("/api/comments/" + commentId))
                .andExpect(status().isOk());
    }
}
