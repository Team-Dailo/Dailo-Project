package com.dailo.backend.controller;

import com.dailo.backend.dto.PostListResponseDto;
import com.dailo.backend.dto.PostRequestDto;
import com.dailo.backend.dto.PostResponseDto;
import com.dailo.backend.service.AuthService;
import com.dailo.backend.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;
    private final AuthService authService;

    /** JWT로 로그인한 사용자 ID 우선, 없으면 헤더 X-User-Id 사용 (각 계정 닉네임이 올바르게 표시되도록) */
    private Long resolveAuthorId(Long headerUserId) {
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && auth.getPrincipal() != null) {
                String email = auth.getName();
                return authService.getMemberIdByEmail(email).orElse(headerUserId);
            }
        } catch (Exception ignored) { }
        return headerUserId != null ? headerUserId : 1L;
    }

    @GetMapping
    public ResponseEntity<Page<PostListResponseDto>> getAllPosts(
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "DESC") String direction) {

        Sort.Direction sortDirection = Sort.Direction.fromString(direction);
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, sort));

        return ResponseEntity.ok(postService.getAllPosts(userId, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PostResponseDto> getPostById(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) Long userId) {
        return ResponseEntity.ok(postService.getPostById(id, userId));
    }

    @PostMapping
    public ResponseEntity<PostResponseDto> createPost(
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestBody PostRequestDto requestDto) {

        Long authorId = resolveAuthorId(headerUserId != null ? headerUserId : 1L);
        PostResponseDto response = postService.createPost(requestDto, authorId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PostResponseDto> updatePost(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestBody PostRequestDto requestDto) {

        Long authorId = resolveAuthorId(headerUserId != null ? headerUserId : 1L);
        return ResponseEntity.ok(postService.updatePost(id, requestDto, authorId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePost(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId) {

        Long authorId = resolveAuthorId(headerUserId != null ? headerUserId : 1L);
        postService.deletePost(id, authorId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/category/{categoryType}")
    public ResponseEntity<Page<PostListResponseDto>> getPostsByCategory(
            @PathVariable String categoryType,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(postService.getPostsByCategory(categoryType, userId, pageable));
    }

    @GetMapping("/search")
    public ResponseEntity<Page<PostListResponseDto>> searchPosts(
            @RequestParam String keyword,
            @RequestHeader(value = "X-User-Id", required = false) Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(postService.searchPosts(keyword, userId, pageable));
    }

    /** 내가 쓴 글 목록 (마이페이지 게시판 기록) - JWT 사용자 우선, 없으면 X-User-Id로 본인 글만 조회 */
    @GetMapping("/my")
    public ResponseEntity<Page<PostListResponseDto>> getMyPosts(
            @RequestHeader(value = "X-User-Id", required = false) Long headerUserId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Long authorId = resolveAuthorId(headerUserId != null ? headerUserId : 1L);
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(postService.getPostsByAuthorId(authorId, pageable));
    }
}
