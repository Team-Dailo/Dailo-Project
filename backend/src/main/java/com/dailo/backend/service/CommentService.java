package com.dailo.backend.service;

import com.dailo.backend.dto.CommentRequestDto;
import com.dailo.backend.dto.CommentResponseDto;
import com.dailo.backend.entity.Comment;
import com.dailo.backend.entity.Post;
import com.dailo.backend.repository.CommentRepository;
import com.dailo.backend.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CommentService {

    private final CommentRepository commentRepository;
    private final PostRepository postRepository;

    // 1. 댓글 목록 조회
    public Page<CommentResponseDto> getCommentsByPostId(Long postId, Pageable pageable) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found: " + postId));

        return commentRepository.findByPost(post, pageable)
                .map(CommentResponseDto::from);
    }

    // 2. 댓글 생성
    @Transactional
    public CommentResponseDto createComment(Long postId, CommentRequestDto requestDto, Long authorId) {
        requestDto.validate();

        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new RuntimeException("Post not found: " + postId));

        Comment comment = requestDto.toEntity(post, authorId);
        Comment savedComment = commentRepository.save(comment);

        postRepository.increaseCommentCount(postId);

        return CommentResponseDto.from(savedComment);
    }

    // 3. 댓글 수정
    @Transactional
    public CommentResponseDto updateComment(Long id, CommentRequestDto requestDto, Long authorId) {
        requestDto.validate();

        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Comment not found: " + id));

        if (!comment.getAuthorId().equals(authorId)) {
            throw new RuntimeException("You are not the author of this comment");
        }

        comment.update(requestDto.getContent());

        return CommentResponseDto.from(comment);
    }

    // 4. 댓글 삭제
    @Transactional
    public void deleteComment(Long id, Long authorId) {
        Comment comment = commentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Comment not found: " + id));

        if (!comment.getAuthorId().equals(authorId)) {
            throw new RuntimeException("You are not the author of this comment");
        }

        if (comment.getDeletedAt() != null) {
            throw new RuntimeException("Comment is already deleted");
        }

        Long postId = comment.getPost().getId();

        commentRepository.delete(comment);

        postRepository.decreaseCommentCount(postId);
    }
}
