package com.dailo.backend.service;

import com.dailo.backend.dto.CommentRequestDto;
import com.dailo.backend.dto.CommentResponseDto;
import com.dailo.backend.entity.Comment;
import com.dailo.backend.entity.Member;
import com.dailo.backend.entity.Post;
import com.dailo.backend.exception.ForbiddenException;
import com.dailo.backend.exception.NotFoundException;
import com.dailo.backend.repository.CommentRepository;
import com.dailo.backend.repository.MemberRepository;
import com.dailo.backend.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final MemberRepository memberRepository;
    private final BlockService blockService;

    private final S3UploadService s3UploadService;

    // 이메일로 내 ID를 찾아주는 내부 헬퍼 메서드
    private Long getMemberIdByEmail(String email) {
        if (email == null) return null;
        return memberRepository.findByEmail(email)
                .map(Member::getId)
                .orElseThrow(() -> new NotFoundException("Member not found: " + email));
    }

    // 1. 댓글 목록 조회 (최상위 댓글 + 대댓글 포함, 작성자 닉네임 포함)
    public Page<CommentResponseDto> getCommentsByPostId(Long postId, String email, Pageable pageable) {
        Long userId = getMemberIdByEmail(email);

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new NotFoundException("Post not found: " + postId));

        Set<Long> invisibleIds = (userId != null) ? blockService.getInvisibleUserIds(userId) : Collections.emptySet();

        // 삭제되지 않은 최상위 댓글만 조회
        Page<Comment> topLevelComments;
        if (invisibleIds.isEmpty()) {
            topLevelComments = commentRepository.findByPostAndParentCommentIsNull(post, pageable);
        } else {
            topLevelComments = commentRepository.findByPostAndParentCommentIsNullExcludingAuthors(post, invisibleIds, pageable);
        }

        List<Comment> topList = topLevelComments.getContent();

        Set<Long> authorIds = new java.util.HashSet<>();
        for (Comment c : topList) {
            authorIds.add(c.getAuthorId());
            for (Comment r : getReplies(c, invisibleIds)) {
                authorIds.add(r.getAuthorId());
            }
        }

        Map<Long, String> authorNicknameMap = authorIds.isEmpty() ? Collections.emptyMap()
                : memberRepository.findAllById(authorIds).stream()
                .collect(Collectors.toMap(Member::getId, m -> {
                    String n = m.getNickname();
                    if (n != null && !n.isBlank()) return n.trim();
                    String mEmail = m.getEmail();
                    if (mEmail != null && mEmail.contains("@")) return mEmail.split("@")[0].trim();
                    return "user_" + m.getId();
                }));

        Map<Long, String> authorProfileImageUrlMap = authorIds.isEmpty() ? Collections.emptyMap()
                : memberRepository.findAllById(authorIds).stream()
                .filter(m -> m.getProfileImageUrl() != null && !m.getProfileImageUrl().isBlank())
                .collect(Collectors.toMap(Member::getId, m -> {
                    try {
                        return s3UploadService.getPresignedUrl(m.getProfileImageUrl());
                    } catch (Exception e) {
                        return "";
                    }
                }));

        List<CommentResponseDto> dtos = topList.stream()
                .map(comment -> {
                    List<Comment> replies = getReplies(comment, invisibleIds);
                    return CommentResponseDto.fromWithReplies(comment, replies, authorNicknameMap, authorProfileImageUrlMap);
                })
                .toList();
        return new PageImpl<>(dtos, pageable, topLevelComments.getTotalElements());
    }

    // 대댓글 조회 (차단 필터 적용)
    private List<Comment> getReplies(Comment parentComment, Set<Long> invisibleIds) {
        if (invisibleIds.isEmpty()) {
            return commentRepository.findByParentComment(parentComment);
        }
        return commentRepository.findByParentCommentExcludingAuthors(parentComment, invisibleIds);
    }

    // 2. 댓글 생성
    @Transactional
    public CommentResponseDto createComment(Long postId, CommentRequestDto requestDto, String email) {
        Long authorId = getMemberIdByEmail(email);
        requestDto.validate();

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new NotFoundException("Post not found: " + postId));

        Comment parentComment = null;
        if (requestDto.getParentCommentId() != null) {
            parentComment = commentRepository.findById(requestDto.getParentCommentId())
                    .orElseThrow(() -> new NotFoundException("Parent comment not found: " + requestDto.getParentCommentId()));

            if (!parentComment.getPost().getId().equals(postId)) {
                throw new IllegalArgumentException("Parent comment does not belong to this post");
            }

            if (parentComment.getParentComment() != null) {
                throw new IllegalArgumentException("Nested replies are not allowed");
            }
        }

        String nickname = memberRepository.findById(authorId)
                .map(m -> {
                    String n = m.getNickname();
                    if (n != null && !n.isBlank()) return n.trim();
                    String mEmail = m.getEmail();
                    if (mEmail != null && mEmail.contains("@")) return mEmail.split("@")[0].trim();
                    return "user_" + authorId;
                })
                .orElse("user_" + authorId);

        Comment comment = Comment.builder()
                .post(post)
                .authorId(authorId)
                .authorNickname(nickname)
                .content(requestDto.getContent().trim())
                .parentComment(parentComment)
                .build();

        Comment savedComment = commentRepository.save(comment);
        postRepository.increaseCommentCount(postId);
        String profileUrl = null;
        Member author = memberRepository.findById(authorId).orElse(null);
        if (author != null && author.getProfileImageUrl() != null && !author.getProfileImageUrl().isBlank()) {
            try {
                profileUrl = s3UploadService.getPresignedUrl(author.getProfileImageUrl());
            } catch (Exception ignored) {}
        }
        return CommentResponseDto.from(savedComment, savedComment.getAuthorNickname(), profileUrl);
    }

    // 3. 댓글 수정
    @Transactional
    public CommentResponseDto updateComment(Long id, CommentRequestDto requestDto, String email) {
        Long authorId = getMemberIdByEmail(email);
        requestDto.validate();

        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Comment not found: " + id));

        if (!comment.getAuthorId().equals(authorId)) {
            throw new ForbiddenException("You are not the author of this comment");
        }

        comment.update(requestDto.getContent());

        Member author = memberRepository.findById(comment.getAuthorId()).orElse(null);
        String nickname = author != null ? (author.getNickname() != null && !author.getNickname().isBlank() ? author.getNickname().trim()
                : (author.getEmail() != null && author.getEmail().contains("@") ? author.getEmail().split("@")[0].trim() : "user_" + comment.getAuthorId()))
                : "user_" + comment.getAuthorId();
        String profileUrl = null;
        if (author != null && author.getProfileImageUrl() != null && !author.getProfileImageUrl().isBlank()) {
            try {
                profileUrl = s3UploadService.getPresignedUrl(author.getProfileImageUrl());
            } catch (Exception ignored) {}
        }
        return CommentResponseDto.from(comment, nickname, profileUrl);
    }

    // 4. 댓글 삭제
    @Transactional
    public void deleteComment(Long id, String email) {
        Long authorId = getMemberIdByEmail(email);
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Comment not found: " + id));

        // 이미 삭제된 댓글인 경우
        if (comment.isDeleted()) {
            throw new NotFoundException("Comment not found: " + id);
        }

        if (!comment.getAuthorId().equals(authorId)) {
            throw new ForbiddenException("You are not the author of this comment");
        }

        Long postId = comment.getPost().getId();
        commentRepository.delete(comment);
        postRepository.decreaseCommentCount(postId);
    }
}