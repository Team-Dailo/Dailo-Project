package com.dailo.backend.dto;

import com.dailo.backend.entity.Comment;
import com.dailo.backend.entity.Post;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CommentRequestDto {

    private String content;
    private Long parentCommentId;  // 대댓글인 경우 부모 댓글 ID

    public void validate() {
        if (content == null || content.trim().isEmpty()) {
            throw new IllegalArgumentException("Content cannot be empty");
        }
        if (content.length() > 1000) {
            throw new IllegalArgumentException("Content is too long (max 1000 characters)");
        }
    }

    public Comment toEntity(Post post, Long authorId) {
        return Comment.builder()
                .post(post)
                .authorId(authorId)
                .content(this.content.trim())
                .build();
    }
}
