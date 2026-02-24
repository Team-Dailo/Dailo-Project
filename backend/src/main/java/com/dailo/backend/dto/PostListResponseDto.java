package com.dailo.backend.dto;

import com.dailo.backend.entity.Post;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PostListResponseDto {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private Long id;
    private Long authorId;
    /** 작성자 닉네임 (표시용) */
    private String authorNickname;
    /** 작성자 프로필 이미지 URL (목록용) */
    private String authorProfileImageUrl;
    private String title;
    private String categoryType;
    /** 후기일 때 연관 행사 ID */
    private Long eventId;
    /** 후기일 때 연관 행사 제목 (표시용) */
    private String eventTitle;
    /** 첨부 이미지 URL (목록용 첫 장만, 상세는 imageUrls) */
    private List<String> imageUrls;
    private Integer viewCount;
    private Integer likeCount;
    private Integer commentCount;
    private LocalDateTime createdAt;
    /** 목록 조회 시 로그인 사용자가 좋아요 눌렀는지 (선택) */
    private Boolean liked;

    private static List<String> parseImageUrls(String imageUrlsJson) {
        if (imageUrlsJson == null || imageUrlsJson.isBlank()) return Collections.emptyList();
        try {
            return OBJECT_MAPPER.readValue(imageUrlsJson, new TypeReference<>() {});
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public static PostListResponseDto from(Post post) {
        return from(post, null, null);
    }

    public static PostListResponseDto from(Post post, String authorNickname) {
        return from(post, authorNickname, null);
    }

    public static PostListResponseDto from(Post post, String authorNickname, Boolean liked) {
        return from(post, authorNickname, liked, null);
    }

    public static PostListResponseDto from(Post post, String authorNickname, Boolean liked, String eventTitle) {
        return from(post, authorNickname, liked, eventTitle, null);
    }

    public static PostListResponseDto from(Post post, String authorNickname, Boolean liked, String eventTitle, String authorProfileImageUrl) {
        return PostListResponseDto.builder()
                .id(post.getId())
                .authorId(post.getAuthorId())
                .authorNickname(authorNickname != null ? authorNickname : "알 수 없음")
                .authorProfileImageUrl(authorProfileImageUrl != null && !authorProfileImageUrl.isBlank() ? authorProfileImageUrl : null)
                .title(post.getTitle())
                .categoryType(post.getCategoryType())
                .eventId(post.getEventId())
                .eventTitle(eventTitle)
                .imageUrls(parseImageUrls(post.getImageUrlsJson()))
                .viewCount(post.getViewCount())
                .likeCount(post.getLikeCount())
                .commentCount(post.getCommentCount())
                .createdAt(post.getCreatedAt())
                .liked(liked)
                .build();
    }
}
