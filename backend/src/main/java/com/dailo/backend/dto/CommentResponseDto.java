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
    /** 게시글 제목 (사용자별 댓글 목록 조회 시 사용) */
    private String postTitle;
    private Long parentCommentId;
    private Long authorId;
    /** 댓글 작성자 닉네임 (표시용) */
    private String authorNickname;
    /** 댓글 작성자 프로필 이미지 URL (표시용, presigned) */
    private String authorProfileImageUrl;
    private String content;
    private Integer likeCount;
    /** 현재 로그인 사용자가 이 댓글에 좋아요를 눌렀는지 */
    private Boolean isLiked;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    /** 삭제된 댓글 여부 */
    private boolean deleted;

    @Builder.Default
    private List<CommentResponseDto> replies = new ArrayList<>();

    /** 저장된 닉네임 우선, 없으면 서비스에서 전달한 authorNickname, 없으면 user_작성자Id */
    public static CommentResponseDto from(Comment comment, String authorNickname) {
        return from(comment, authorNickname, null);
    }

    public static CommentResponseDto from(Comment comment, String authorNickname, String authorProfileImageUrl) {
        boolean isDeleted = comment.isDeleted();

        // 삭제된 댓글은 닉네임, 프로필, 내용 숨김
        String displayName;
        String profileUrl;
        String content;

        if (isDeleted) {
            displayName = null;
            profileUrl = null;
            content = null;
        } else {
            String stored = comment.getAuthorNickname();
            displayName = (stored != null && !stored.isBlank())
                    ? stored.trim()
                    : (authorNickname != null && !authorNickname.isBlank())
                            ? authorNickname.trim()
                            : "user_" + comment.getAuthorId();
            profileUrl = (authorProfileImageUrl != null && !authorProfileImageUrl.isBlank()) ? authorProfileImageUrl : null;
            content = comment.getContent();
        }

        return CommentResponseDto.builder()
                .id(comment.getId())
                .postId(comment.getPost().getId())
                .parentCommentId(comment.getParentComment() != null ? comment.getParentComment().getId() : null)
                .authorId(isDeleted ? null : comment.getAuthorId())
                .authorNickname(displayName)
                .authorProfileImageUrl(profileUrl)
                .content(content)
                .likeCount(isDeleted ? 0 : comment.getLikeCount())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .deleted(isDeleted)
                .replies(new ArrayList<>())
                .build();
    }

    // 대댓글 포함 변환 (저장된 닉네임 우선, 없으면 맵에서 조회)
    public static CommentResponseDto fromWithReplies(Comment comment, List<Comment> replies,
                                                     java.util.Map<Long, String> authorNicknameMap,
                                                     java.util.Map<Long, String> authorProfileImageUrlMap) {
        return fromWithReplies(comment, replies, authorNicknameMap, authorProfileImageUrlMap, java.util.Collections.emptySet());
    }

    public static CommentResponseDto fromWithReplies(Comment comment, List<Comment> replies,
                                                     java.util.Map<Long, String> authorNicknameMap,
                                                     java.util.Map<Long, String> authorProfileImageUrlMap,
                                                     java.util.Set<Long> likedIds) {
        String fromMap = authorNicknameMap != null ? authorNicknameMap.get(comment.getAuthorId()) : null;
        String profileUrl = authorProfileImageUrlMap != null ? authorProfileImageUrlMap.get(comment.getAuthorId()) : null;
        CommentResponseDto dto = from(comment, fromMap, profileUrl);
        dto.isLiked = likedIds.contains(comment.getId());
        if (replies != null && !replies.isEmpty()) {
            dto.getReplies().addAll(replies.stream()
                    .map(r -> {
                        CommentResponseDto replyDto = from(r,
                                authorNicknameMap != null ? authorNicknameMap.get(r.getAuthorId()) : null,
                                authorProfileImageUrlMap != null ? authorProfileImageUrlMap.get(r.getAuthorId()) : null);
                        replyDto.isLiked = likedIds.contains(r.getId());
                        return replyDto;
                    })
                    .toList());
        }
        return dto;
    }
}
