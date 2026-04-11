package com.dailo.backend.controller;

import com.dailo.backend.dto.admin.AdminCommentDto;
import com.dailo.backend.service.AdminCommentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/comments")
@RequiredArgsConstructor
@Tag(name = "Admin Comment API", description = "관리자 댓글 관리")
public class AdminCommentController {

    private final AdminCommentService adminCommentService;

    @Operation(summary = "댓글 목록 조회 (최신순)")
    @GetMapping
    public ResponseEntity<Page<AdminCommentDto>> getComments(
            @PageableDefault(size = 20) Pageable pageable
    ) {
        Page<AdminCommentDto> comments = adminCommentService.getComments(pageable);
        return ResponseEntity.ok(comments);
    }

    @Operation(summary = "신고된 댓글 목록 조회")
    @GetMapping("/reported")
    public ResponseEntity<Page<AdminCommentDto>> getReportedComments(
            @PageableDefault(size = 20) Pageable pageable
    ) {
        Page<AdminCommentDto> comments = adminCommentService.getReportedComments(pageable);
        return ResponseEntity.ok(comments);
    }

    @Operation(summary = "댓글 상세 조회")
    @GetMapping("/{id}")
    public ResponseEntity<AdminCommentDto> getComment(@PathVariable Long id) {
        AdminCommentDto comment = adminCommentService.getComment(id);
        return ResponseEntity.ok(comment);
    }

    @Operation(summary = "댓글 숨김 처리")
    @PatchMapping("/{id}/hide")
    public ResponseEntity<AdminCommentDto> hideComment(@PathVariable Long id) {
        AdminCommentDto comment = adminCommentService.hideComment(id);
        return ResponseEntity.ok(comment);
    }

    @Operation(summary = "댓글 숨김 해제")
    @PatchMapping("/{id}/restore")
    public ResponseEntity<AdminCommentDto> restoreComment(@PathVariable Long id) {
        AdminCommentDto comment = adminCommentService.restoreComment(id);
        return ResponseEntity.ok(comment);
    }

    @Operation(summary = "댓글 삭제")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteComment(@PathVariable Long id) {
        adminCommentService.deleteComment(id);
        return ResponseEntity.noContent().build();
    }
}
