package com.dailo.backend.dto;

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
public class PostListResponseDto {

    private Long id;
    private Long authorId;
    /** 작성자 닉네임 (표시용) */
    private String authorNickname;
    private String title;
    private String categoryType;
    private Integer viewCount;
    private Integer likeCount;
    private Integer commentCount;
    private LocalDateTime createdAt;

    public static PostListResponseDto from(Post post) {
        return from(post, null);
    }

    public static PostListResponseDto from(Post post, String authorNickname) {
        return PostListResponseDto.builder()
                .id(post.getId())
                .authorId(post.getAuthorId())
                .authorNickname(authorNickname != null ? authorNickname : "알 수 없음")
                .title(post.getTitle())
                .categoryType(post.getCategoryType())
                .viewCount(post.getViewCount())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .createdAt(post.getCreatedAt())
                .build();
    }
}
