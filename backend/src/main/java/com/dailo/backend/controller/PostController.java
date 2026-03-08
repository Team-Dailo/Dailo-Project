package com.dailo.backend.controller;

import com.dailo.backend.dto.PostLikeResponseDto;
import com.dailo.backend.dto.PostListResponseDto;
import com.dailo.backend.dto.PostRequestDto;
import com.dailo.backend.dto.PostResponseDto;
import com.dailo.backend.service.PostService;
import com.dailo.backend.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/posts")
@RequiredArgsConstructor
public class PostController {

    private final PostService postService;

    @GetMapping
    public ResponseEntity<Page<PostListResponseDto>> getAllPosts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "DESC") String direction) {

        // 💡 X-User-Id 헤더 대신 SecurityUtil을 통해 안전하게 토큰에서 이메일 추출 (비로그인 시 null 반환)
        String email = SecurityUtil.getCurrentMemberEmail();

        Sort.Direction sortDirection = Sort.Direction.fromString(direction);
        Pageable pageable = PageRequest.of(page, size, Sort.by(sortDirection, sort));

        return ResponseEntity.ok(postService.getAllPosts(email, pageable));
    }

    /** 내가 쓴 글 목록 (마이페이지 게시판 기록) - 인증 필요 */
    @GetMapping("/my")
    public ResponseEntity<Page<PostListResponseDto>> getMyPosts(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        String email = userDetails.getUsername(); // 💡 Long 변환 제거
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(postService.getMyPosts(email, pageable));
    }

    /** 좋아요 누른 글 목록 (마이페이지) - 인증 필요 */
    @GetMapping("/liked")
    public ResponseEntity<Page<PostListResponseDto>> getLikedPosts(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        String email = userDetails.getUsername(); // 💡 Long 변환 제거
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(postService.getLikedPosts(email, pageable));
    }

    /** 댓글 단 글 목록 (마이페이지) - 인증 필요 */
    @GetMapping("/commented")
    public ResponseEntity<Page<PostListResponseDto>> getCommentedPosts(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        String email = userDetails.getUsername(); // 💡 Long 변환 제거
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(postService.getCommentedPosts(email, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PostResponseDto> getPostById(@PathVariable Long id) {
        // 💡 X-User-Id 헤더 제거, SecurityUtil 사용
        String email = SecurityUtil.getCurrentMemberEmail();
        return ResponseEntity.ok(postService.getPostById(id, email));
    }

    @PostMapping
    public ResponseEntity<PostResponseDto> createPost(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody PostRequestDto requestDto) {

        String email = userDetails.getUsername(); // 💡 Long 변환 제거
        PostResponseDto response = postService.createPost(requestDto, email);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<PostResponseDto> updatePost(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody PostRequestDto requestDto) {

        String email = userDetails.getUsername(); // 💡 Long 변환 제거
        return ResponseEntity.ok(postService.updatePost(id, requestDto, email));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePost(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        String email = userDetails.getUsername(); // 💡 Long 변환 제거
        postService.deletePost(id, email);
        return ResponseEntity.noContent().build();
    }

    /** 행사별 후기 목록 (해당 행사에 연결된 게시글) */
    @GetMapping("/event/{eventId}")
    public ResponseEntity<Page<PostListResponseDto>> getPostsByEventId(
            @PathVariable Long eventId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        // 💡 X-User-Id 헤더 제거, SecurityUtil 사용
        String email = SecurityUtil.getCurrentMemberEmail();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(postService.getPostsByEventId(eventId, email, pageable));
    }

    @GetMapping("/category/{categoryType}")
    public ResponseEntity<Page<PostListResponseDto>> getPostsByCategory(
            @PathVariable String categoryType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        // 💡 X-User-Id 헤더 제거, SecurityUtil 사용
        String email = SecurityUtil.getCurrentMemberEmail();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(postService.getPostsByCategory(categoryType, email, pageable));
    }

    @GetMapping("/search")
    public ResponseEntity<Page<PostListResponseDto>> searchPosts(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        // 💡 X-User-Id 헤더 제거, SecurityUtil 사용
        String email = SecurityUtil.getCurrentMemberEmail();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(postService.searchPosts(keyword, email, pageable));
    }

    /** 게시글 좋아요 토글 (로그인 필요). 기록 저장 후 좋아요 상태·개수 반환 */
    @PostMapping("/{id}/like")
    public ResponseEntity<PostLikeResponseDto> toggleLike(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) { // 💡 헤더 대신 정상적인 토큰 인증 사용

        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String email = userDetails.getUsername();
        boolean liked = postService.togglePostLike(id, email);
        int likeCount = postService.getLikeCount(id);
        return ResponseEntity.ok(new PostLikeResponseDto(liked, likeCount));
    }
}