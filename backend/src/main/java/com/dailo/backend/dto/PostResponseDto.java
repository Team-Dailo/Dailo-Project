package com.dailo.backend.dto;

import com.dailo.backend.domain.enums.PostStatus;
import com.dailo.backend.entity.Post;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostResponseDto {

    private Long id;
    private Long authorId;
    private String authorNickname;
    private String title;
    private String content;
    private String categoryType;
    private Integer viewCount;
    private Integer likeCount;
    private Integer commentCount;
    private PostStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static PostResponseDto from(Post post, String authorNickname) {
        String name = authorNickname != null && !authorNickname.isBlank()
                ? authorNickname
                : ("user_" + post.getAuthorId());
        return PostResponseDto.builder()
                .id(post.getId())
                .authorId(post.getAuthorId())
                .authorNickname(name)
                .title(post.getTitle())
                .content(post.getContent())
                .categoryType(post.getCategoryType())
                .viewCount(post.getViewCount())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .status(post.getStatus())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .build();
    }
}
