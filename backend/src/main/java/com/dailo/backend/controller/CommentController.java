package com.dailo.backend.controller;

import com.dailo.backend.dto.CommentRequestDto;
import com.dailo.backend.dto.CommentResponseDto;
import com.dailo.backend.service.CommentService;
import com.dailo.backend.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    // 1. 댓글 목록 조회
    @GetMapping("/posts/{postId}/comments")
    public Page<CommentResponseDto> getComments(
            @PathVariable Long postId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        // 💡 X-User-Id 헤더 대신 SecurityUtil을 통해 안전하게 이메일 추출
        String email = SecurityUtil.getCurrentMemberEmail();

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return commentService.getCommentsByPostId(postId, email, pageable);
    }

    // 2. 댓글 생성
    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<CommentResponseDto> createComment(
            @PathVariable Long postId,
            @RequestBody CommentRequestDto requestDto,
            @AuthenticationPrincipal UserDetails userDetails) {

        String email = userDetails.getUsername();
        CommentResponseDto comment = commentService.createComment(postId, requestDto, email);
        return ResponseEntity.ok(comment);
    }

    // 3. 댓글 수정
    @PutMapping("/comments/{id}")
    public ResponseEntity<CommentResponseDto> updateComment(
            @PathVariable Long id,
            @RequestBody CommentRequestDto requestDto,
            @AuthenticationPrincipal UserDetails userDetails) {

        String email = userDetails.getUsername();
        CommentResponseDto comment = commentService.updateComment(id, requestDto, email);
        return ResponseEntity.ok(comment);
    }

    // 4. 댓글 삭제
    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        String email = userDetails.getUsername();
        commentService.deleteComment(id, email);
        return ResponseEntity.ok().build();
    }
}