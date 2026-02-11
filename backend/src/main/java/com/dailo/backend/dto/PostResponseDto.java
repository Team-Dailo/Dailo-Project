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
    /** 작성자 닉네임 (표시용) */
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
    /** 로그인 사용자가 이 게시글에 좋아요를 눌렀는지 */
    private Boolean isLiked;

    public static PostResponseDto from(Post post) {
        return from(post, null, null);
    }

    public static PostResponseDto from(Post post, String authorNickname) {
        return from(post, authorNickname, null);
    }

    public static PostResponseDto from(Post post, String authorNickname, Boolean isLiked) {
        return PostResponseDto.builder()
                .id(post.getId())
                .authorId(post.getAuthorId())
                .authorNickname(authorNickname != null ? authorNickname : "알 수 없음")
                .title(post.getTitle())
                .content(post.getContent())
                .categoryType(post.getCategoryType())
                .viewCount(post.getViewCount())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .status(post.getStatus())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .isLiked(isLiked)
                .build();
    }
}
