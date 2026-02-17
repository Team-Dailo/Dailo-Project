package com.dailo.backend.controller;

import com.dailo.backend.dto.PostAuthorUpdateRequest;
import com.dailo.backend.service.PostService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/posts")
@RequiredArgsConstructor
public class AdminPostController {

    private final PostService postService;

    /** 게시글 작성자 변경 (기존에 author_id가 1로 저장된 데이터 수정용) */
    @PatchMapping("/{postId}/author")
    public ResponseEntity<Void> updatePostAuthor(
            @PathVariable Long postId,
            @RequestBody PostAuthorUpdateRequest request) {
        postService.updatePostAuthor(postId, request.getAuthorId());
        return ResponseEntity.noContent().build();
    }

    /** 관리자용: 신고된 게시글 삭제(소프트 삭제) */
    @DeleteMapping("/{postId}")
    public ResponseEntity<Void> deletePost(@PathVariable Long postId) {
        postService.deletePostByAdmin(postId);
        return ResponseEntity.noContent().build();
    }
}
