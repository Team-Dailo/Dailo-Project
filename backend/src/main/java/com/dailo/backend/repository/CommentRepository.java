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
import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    /** 내가 댓글 단 게시글 ID 목록 (최근 댓글 기준 정렬) */
    @Query(value = "SELECT post_id FROM comments WHERE author_id = :authorId AND deleted_at IS NULL GROUP BY post_id ORDER BY MAX(created_at) DESC", nativeQuery = true)
    List<Long> findDistinctPostIdsByAuthorId(@Param("authorId") Long authorId, Pageable pageable);

    @Query("SELECT COUNT(DISTINCT c.post.id) FROM Comment c WHERE c.authorId = :authorId")
    long countDistinctPostsByAuthorId(@Param("authorId") Long authorId);

    // 게시글별 댓글 조회 (페이징)
    Page<Comment> findByPost(Post post, Pageable pageable);

    // 작성자별 댓글 조회
    Page<Comment> findByAuthorId(Long authorId, Pageable pageable);

    // 작성자별 댓글 조회 (삭제되지 않은 것만)
    Page<Comment> findByAuthorIdAndDeletedAtIsNull(Long authorId, Pageable pageable);

    // 게시글별 댓글 수 조회
    long countByPost(Post post);

    // 차단 필터 적용된 댓글 조회
    @Query("SELECT c FROM Comment c WHERE c.post = :post AND c.authorId NOT IN :excludeAuthorIds")
    Page<Comment> findByPostExcludingAuthors(
            @Param("post") Post post,
            @Param("excludeAuthorIds") Collection<Long> excludeAuthorIds,
            Pageable pageable);

    // 최상위 댓글만 조회 (parentComment가 null, 삭제되지 않은 것만)
    @Query("SELECT c FROM Comment c WHERE c.post = :post AND c.parentComment IS NULL AND c.deletedAt IS NULL")
    Page<Comment> findByPostAndParentCommentIsNull(@Param("post") Post post, Pageable pageable);

    // 최상위 댓글 + 차단 필터 (삭제되지 않은 것만)
    @Query("SELECT c FROM Comment c WHERE c.post = :post AND c.parentComment IS NULL AND c.deletedAt IS NULL AND c.authorId NOT IN :excludeAuthorIds")
    Page<Comment> findByPostAndParentCommentIsNullExcludingAuthors(
            @Param("post") Post post,
            @Param("excludeAuthorIds") Collection<Long> excludeAuthorIds,
            Pageable pageable);

    // 최상위 댓글 조회 (삭제된 댓글 포함 - 대댓글이 있는 경우 "삭제된 댓글" 표시용)
    @Query("SELECT c FROM Comment c WHERE c.post = :post AND c.parentComment IS NULL ORDER BY c.createdAt ASC")
    List<Comment> findTopLevelCommentsIncludingDeletedByPost(@Param("post") Post post);

    // 최상위 댓글 조회 + 차단 필터 (삭제된 댓글 포함)
    @Query("SELECT c FROM Comment c WHERE c.post = :post AND c.parentComment IS NULL AND (c.deletedAt IS NOT NULL OR c.authorId NOT IN :excludeAuthorIds) ORDER BY c.createdAt ASC")
    List<Comment> findTopLevelCommentsIncludingDeletedByPostExcludingAuthors(
            @Param("post") Post post,
            @Param("excludeAuthorIds") Collection<Long> excludeAuthorIds);

    // 특정 댓글의 대댓글 조회 (삭제되지 않은 것만)
    @Query("SELECT c FROM Comment c WHERE c.parentComment = :parentComment AND c.deletedAt IS NULL ORDER BY c.createdAt ASC")
    List<Comment> findByParentComment(@Param("parentComment") Comment parentComment);

    // 특정 댓글의 대댓글 + 차단 필터 (삭제되지 않은 것만)
    @Query("SELECT c FROM Comment c WHERE c.parentComment = :parentComment AND c.deletedAt IS NULL AND c.authorId NOT IN :excludeAuthorIds ORDER BY c.createdAt ASC")
    List<Comment> findByParentCommentExcludingAuthors(
            @Param("parentComment") Comment parentComment,
            @Param("excludeAuthorIds") Collection<Long> excludeAuthorIds);

    // 보여줄 수 있는 대댓글 수 (삭제되지 않은 대댓글만 카운트)
    @Query("SELECT COUNT(c) FROM Comment c WHERE c.parentComment = :parentComment AND c.deletedAt IS NULL")
    long countVisibleReplies(@Param("parentComment") Comment parentComment);
}
