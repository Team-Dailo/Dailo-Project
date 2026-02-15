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

    // 최상위 댓글만 조회 (parentComment가 null)
    Page<Comment> findByPostAndParentCommentIsNull(Post post, Pageable pageable);

    // 최상위 댓글 + 차단 필터
    @Query("SELECT c FROM Comment c WHERE c.post = :post AND c.parentComment IS NULL AND c.authorId NOT IN :excludeAuthorIds")
    Page<Comment> findByPostAndParentCommentIsNullExcludingAuthors(
            @Param("post") Post post,
            @Param("excludeAuthorIds") Collection<Long> excludeAuthorIds,
            Pageable pageable);

    // 특정 댓글의 대댓글 조회
    @Query("SELECT c FROM Comment c WHERE c.parentComment = :parentComment ORDER BY c.createdAt ASC")
    java.util.List<Comment> findByParentComment(@Param("parentComment") Comment parentComment);

    // 특정 댓글의 대댓글 + 차단 필터
    @Query("SELECT c FROM Comment c WHERE c.parentComment = :parentComment AND c.authorId NOT IN :excludeAuthorIds ORDER BY c.createdAt ASC")
    java.util.List<Comment> findByParentCommentExcludingAuthors(
            @Param("parentComment") Comment parentComment,
            @Param("excludeAuthorIds") Collection<Long> excludeAuthorIds);
}
