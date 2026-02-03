package com.dailo.backend.dto;

import com.dailo.backend.entity.Comment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentResponseDto {

    private Long id;
    private Long postId;
    private Long parentCommentId;
    private Long authorId;
    private String content;
    private Integer likeCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Builder.Default
    private List<CommentResponseDto> replies = new ArrayList<>();

    public static CommentResponseDto from(Comment comment) {
        return CommentResponseDto.builder()
                .id(comment.getId())
                .postId(comment.getPost().getId())
                .parentCommentId(comment.getParentComment() != null ? comment.getParentComment().getId() : null)
                .authorId(comment.getAuthorId())
                .content(comment.getContent())
                .likeCount(comment.getLikeCount())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .replies(new ArrayList<>())
                .build();
    }

    // 대댓글 포함 변환
    public static CommentResponseDto fromWithReplies(Comment comment, List<Comment> replies) {
        CommentResponseDto dto = from(comment);
        if (replies != null && !replies.isEmpty()) {
            dto.replies.addAll(replies.stream()
                    .map(CommentResponseDto::from)
                    .toList());
        }
        return dto;
    }
}
