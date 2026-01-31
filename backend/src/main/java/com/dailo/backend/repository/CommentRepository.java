package com.dailo.backend.repository;

import com.dailo.backend.entity.Comment;
import com.dailo.backend.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    // 게시글별 댓글 조회 (페이징)
    Page<Comment> findByPost(Post post, Pageable pageable);

    // 작성자별 댓글 조회
    Page<Comment> findByAuthorId(Long authorId, Pageable pageable);

    // 게시글별 댓글 수 조회
    long countByPost(Post post);

    // 차단 필터 적용된 댓글 조회
    @Query("SELECT c FROM Comment c WHERE c.post = :post AND c.authorId NOT IN :excludeAuthorIds")
    Page<Comment> findByPostExcludingAuthors(
            @Param("post") Post post,
            @Param("excludeAuthorIds") Collection<Long> excludeAuthorIds,
            Pageable pageable);
}
