package com.dailo.backend.service;

import com.dailo.backend.dto.CommentRequestDto;
import com.dailo.backend.dto.CommentResponseDto;
import com.dailo.backend.entity.Comment;
import com.dailo.backend.entity.Post;
import com.dailo.backend.exception.ForbiddenException;
import com.dailo.backend.exception.NotFoundException;
import com.dailo.backend.repository.CommentRepository;
import com.dailo.backend.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;
    private final BlockService blockService;

    // 1. 댓글 목록 조회 (최상위 댓글 + 대댓글 포함, 차단 필터 적용)
    // TODO: N+1 최적화 - 대댓글 많아지면 IN (:parentIds)로 한번에 조회 후 grouping
    public Page<CommentResponseDto> getCommentsByPostId(Long postId, Long userId, Pageable pageable) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new NotFoundException("Post not found: " + postId));

        Set<Long> invisibleIds = (userId != null) ? blockService.getInvisibleUserIds(userId) : Collections.emptySet();

        // 최상위 댓글만 조회 (parentComment가 null)
        Page<Comment> topLevelComments;
        if (invisibleIds.isEmpty()) {
            topLevelComments = commentRepository.findByPostAndParentCommentIsNull(post, pageable);
        } else {
            topLevelComments = commentRepository.findByPostAndParentCommentIsNullExcludingAuthors(post, invisibleIds, pageable);
        }

        // 각 최상위 댓글에 대댓글 첨부
        return topLevelComments.map(comment -> {
            List<Comment> replies = getReplies(comment, invisibleIds);
            return CommentResponseDto.fromWithReplies(comment, replies);
        });
    }

    // 대댓글 조회 (차단 필터 적용)
    private List<Comment> getReplies(Comment parentComment, Set<Long> invisibleIds) {
        if (invisibleIds.isEmpty()) {
            return commentRepository.findByParentComment(parentComment);
        }
        return commentRepository.findByParentCommentExcludingAuthors(parentComment, invisibleIds);
    }

    // 2. 댓글 생성 (대댓글 지원)
    @Transactional
    public CommentResponseDto createComment(Long postId, CommentRequestDto requestDto, Long authorId) {
        requestDto.validate();

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new NotFoundException("Post not found: " + postId));

        // 대댓글인 경우 부모 댓글 조회 및 검증
        Comment parentComment = null;
        if (requestDto.getParentCommentId() != null) {
            parentComment = commentRepository.findById(requestDto.getParentCommentId())
                    .orElseThrow(() -> new NotFoundException("Parent comment not found: " + requestDto.getParentCommentId()));

            // 부모 댓글이 같은 게시글에 속하는지 검증
            if (!parentComment.getPost().getId().equals(postId)) {
                throw new IllegalArgumentException("Parent comment does not belong to this post");
            }

            // 대댓글의 대댓글 방지 (1단계만 허용)
            if (parentComment.getParentComment() != null) {
                throw new IllegalArgumentException("Nested replies are not allowed");
            }
        }

        Comment comment = Comment.builder()
                .post(post)
                .authorId(authorId)
                .content(requestDto.getContent().trim())
                .parentComment(parentComment)
                .build();

        Comment savedComment = commentRepository.save(comment);
        postRepository.increaseCommentCount(postId);

        return CommentResponseDto.from(savedComment);
    }

    // 3. 댓글 수정
    @Transactional
    public CommentResponseDto updateComment(Long id, CommentRequestDto requestDto, Long authorId) {
        requestDto.validate();

        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Comment not found: " + id));

        if (!comment.getAuthorId().equals(authorId)) {
            throw new ForbiddenException("You are not the author of this comment");
        }

        comment.update(requestDto.getContent());

        return CommentResponseDto.from(comment);
    }

    // 4. 댓글 삭제
    // TODO: 대댓글이 있는 부모 댓글 삭제 정책 결정 필요
    //       - A안: 대댓글도 함께 삭제 (cascade)
    //       - B안: soft delete + "삭제된 댓글입니다" 표시
    //       - C안: 대댓글 있으면 삭제 불가 (400 반환)
    @Transactional
    public void deleteComment(Long id, Long authorId) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Comment not found: " + id));

        if (!comment.getAuthorId().equals(authorId)) {
            throw new ForbiddenException("You are not the author of this comment");
        }

        Long postId = comment.getPost().getId();

        commentRepository.delete(comment);

        postRepository.decreaseCommentCount(postId);
    }
}
