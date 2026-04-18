package com.dailo.backend.dto.admin;

import com.dailo.backend.domain.enums.CommentStatus;
import com.dailo.backend.entity.Comment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminCommentDto {
    private Long id;
    private Long postId;
    private String postTitle;
    private Long authorId;
    private String authorNickname;
    private String content;
    private CommentStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime deletedAt;
    private int reportCount;

    public static AdminCommentDto from(Comment comment, int reportCount) {
        return AdminCommentDto.builder()
                .id(comment.getId())
                .postId(comment.getPost().getId())
                .postTitle(comment.getPost().getTitle())
                .authorId(comment.getAuthorId())
                .authorNickname(comment.getAuthorNickname())
                .content(comment.getContent())
                .status(comment.getStatus())
                .createdAt(comment.getCreatedAt())
                .deletedAt(comment.getDeletedAt())
                .reportCount(reportCount)
                .build();
    }

    public static AdminCommentDto from(Comment comment) {
        return from(comment, 0);
    }
}
