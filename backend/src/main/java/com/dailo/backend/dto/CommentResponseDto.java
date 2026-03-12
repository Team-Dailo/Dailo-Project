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
    /** 댓글 작성자 닉네임 (표시용) */
    private String authorNickname;
    /** 댓글 작성자 프로필 이미지 URL (표시용, presigned) */
    private String authorProfileImageUrl;
    private String content;
    private Integer likeCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Builder.Default
    private List<CommentResponseDto> replies = new ArrayList<>();

    /** 저장된 닉네임 우선, 없으면 서비스에서 전달한 authorNickname, 없으면 user_작성자Id */
    public static CommentResponseDto from(Comment comment, String authorNickname) {
        return from(comment, authorNickname, null);
    }

    public static CommentResponseDto from(Comment comment, String authorNickname, String authorProfileImageUrl) {
        String stored = comment.getAuthorNickname();
        String displayName = (stored != null && !stored.isBlank())
                ? stored.trim()
                : (authorNickname != null && !authorNickname.isBlank())
                        ? authorNickname.trim()
                        : "user_" + comment.getAuthorId();
        return CommentResponseDto.builder()
                .id(comment.getId())
                .postId(comment.getPost().getId())
                .parentCommentId(comment.getParentComment() != null ? comment.getParentComment().getId() : null)
                .authorId(comment.getAuthorId())
                .authorNickname(displayName)
                .authorProfileImageUrl(authorProfileImageUrl != null && !authorProfileImageUrl.isBlank() ? authorProfileImageUrl : null)
                .content(comment.getContent())
                .likeCount(comment.getLikeCount())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .replies(new ArrayList<>())
                .build();
    }

    // 대댓글 포함 변환 (저장된 닉네임 우선, 없으면 맵에서 조회)
    public static CommentResponseDto fromWithReplies(Comment comment, List<Comment> replies,
                                                     java.util.Map<Long, String> authorNicknameMap,
                                                     java.util.Map<Long, String> authorProfileImageUrlMap) {
        String fromMap = authorNicknameMap != null ? authorNicknameMap.get(comment.getAuthorId()) : null;
        String profileUrl = authorProfileImageUrlMap != null ? authorProfileImageUrlMap.get(comment.getAuthorId()) : null;
        CommentResponseDto dto = from(comment, fromMap, profileUrl);
        if (replies != null && !replies.isEmpty()) {
            dto.getReplies().addAll(replies.stream()
                    .map(r -> from(r, authorNicknameMap != null ? authorNicknameMap.get(r.getAuthorId()) : null, authorProfileImageUrlMap != null ? authorProfileImageUrlMap.get(r.getAuthorId()) : null))
                    .toList());
        }
        return dto;
    }
}
