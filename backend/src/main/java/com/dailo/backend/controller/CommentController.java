package com.dailo.backend.controller;

import com.dailo.backend.dto.CommentRequestDto;
import com.dailo.backend.dto.CommentResponseDto;
import com.dailo.backend.service.CommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
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

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return commentService.getCommentsByPostId(postId, pageable);
    }

    // 2. 댓글 생성
    @PostMapping("/posts/{postId}/comments")
    public ResponseEntity<CommentResponseDto> createComment(
            @PathVariable Long postId,
            @RequestBody CommentRequestDto requestDto,
            @RequestHeader(value = "X-User-Id", defaultValue = "1") Long userId) {

        CommentResponseDto comment = commentService.createComment(postId, requestDto, userId);
        return ResponseEntity.ok(comment);
    }

    // 3. 댓글 수정
    @PutMapping("/comments/{id}")
    public ResponseEntity<CommentResponseDto> updateComment(
            @PathVariable Long id,
            @RequestBody CommentRequestDto requestDto,
            @RequestHeader(value = "X-User-Id", defaultValue = "1") Long userId) {

        CommentResponseDto comment = commentService.updateComment(id, requestDto, userId);
        return ResponseEntity.ok(comment);
    }

    // 4. 댓글 삭제
    @DeleteMapping("/comments/{id}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable Long id,
            @RequestHeader(value = "X-User-Id", defaultValue = "1") Long userId) {

        commentService.deleteComment(id, userId);
        return ResponseEntity.ok().build();
    }
}
