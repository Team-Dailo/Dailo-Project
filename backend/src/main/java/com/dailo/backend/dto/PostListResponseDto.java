package com.dailo.backend.dto;

import com.dailo.backend.entity.Post;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostListResponseDto {

    private Long id;
    private Long authorId;
    private String authorNickname;
    private String title;
    @JsonProperty("contentPreview")
    private String contentPreview;
    private String categoryType;
    private Integer viewCount;
    private Integer likeCount;
    private Integer commentCount;
    private LocalDateTime createdAt;

    public static PostListResponseDto from(Post post, String authorNickname) {
        String content = post.getContent();
        if (content == null) content = "";
        String contentPreview = content.length() > 120 ? content.substring(0, 120) + "…" : content;
        String name = authorNickname != null && !authorNickname.isBlank()
                ? authorNickname
                : ("user_" + post.getAuthorId());
        return PostListResponseDto.builder()
                .id(post.getId())
                .authorId(post.getAuthorId())
                .authorNickname(name)
                .title(post.getTitle())
                .contentPreview(contentPreview)
                .categoryType(post.getCategoryType())
                .viewCount(post.getViewCount())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .createdAt(post.getCreatedAt())
                .build();
    }
}
