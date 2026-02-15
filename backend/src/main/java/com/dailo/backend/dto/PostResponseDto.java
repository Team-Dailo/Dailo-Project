package com.dailo.backend.dto;

import com.dailo.backend.domain.enums.PostStatus;
import com.dailo.backend.entity.Post;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

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
    /** 후기일 때 연관 행사 ID */
    private Long eventId;
    private Integer viewCount;
    private Integer likeCount;
    private Integer commentCount;
    private PostStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    /** 로그인 사용자가 이 게시글에 좋아요를 눌렀는지 */
    private Boolean isLiked;
    /** 이미지 Presigned URL 목록 */
    private List<String> imageUrls;

    public static PostResponseDto from(Post post) {
        return from(post, null, null, null);
    }

    public static PostResponseDto from(Post post, String authorNickname) {
        return from(post, authorNickname, null, null);
    }

    public static PostResponseDto from(Post post, String authorNickname, Boolean isLiked) {
        return from(post, authorNickname, isLiked, null);
    }

    public static PostResponseDto from(Post post, String authorNickname, Boolean isLiked, List<String> imageUrls) {
        return PostResponseDto.builder()
                .id(post.getId())
                .authorId(post.getAuthorId())
                .authorNickname(authorNickname != null ? authorNickname : "알 수 없음")
                .title(post.getTitle())
                .content(post.getContent())
                .categoryType(post.getCategoryType())
                .eventId(post.getEventId())
                .viewCount(post.getViewCount())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .status(post.getStatus())
                .createdAt(post.getCreatedAt())
                .updatedAt(post.getUpdatedAt())
                .isLiked(isLiked)
                .imageUrls(imageUrls)
                .build();
    }
}
