package com.dailo.backend.repository;

import com.dailo.backend.entity.Comment;
import com.dailo.backend.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    // 게시글별 댓글 조회 (페이징)
    Page<Comment> findByPost(Post post, Pageable pageable);

    // 작성자별 댓글 조회
    Page<Comment> findByAuthorId(Long authorId, Pageable pageable);

    // 게시글별 댓글 수 조회
    long countByPost(Post post);
}
