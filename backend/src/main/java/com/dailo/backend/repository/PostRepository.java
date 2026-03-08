package com.dailo.backend.repository;

import com.dailo.backend.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {

    Page<Post> findByAuthorId(Long authorId, Pageable pageable);

    Page<Post> findByCategoryType(String categoryType, Pageable pageable);

    /** 행사별 후기 목록 (event_id 로 조회) */
    Page<Post> findByEventId(Long eventId, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.eventId = :eventId AND p.authorId NOT IN :excludeAuthorIds")
    Page<Post> findByEventIdExcludingAuthors(
            @Param("eventId") Long eventId,
            @Param("excludeAuthorIds") Collection<Long> excludeAuthorIds,
            Pageable pageable);

    Page<Post> findByTitleContaining(String keyword, Pageable pageable);

    // 차단 필터 적용된 조회 쿼리
    @Query("SELECT p FROM Post p WHERE p.authorId NOT IN :excludeAuthorIds")
    Page<Post> findAllExcludingAuthors(@Param("excludeAuthorIds") Collection<Long> excludeAuthorIds, Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.categoryType = :categoryType AND p.authorId NOT IN :excludeAuthorIds")
    Page<Post> findByCategoryTypeExcludingAuthors(
            @Param("categoryType") String categoryType,
            @Param("excludeAuthorIds") Collection<Long> excludeAuthorIds,
            Pageable pageable);

    @Query("SELECT p FROM Post p WHERE p.title LIKE CONCAT('%', :keyword, '%') AND p.authorId NOT IN :excludeAuthorIds")
    Page<Post> findByTitleContainingExcludingAuthors(
            @Param("keyword") String keyword,
            @Param("excludeAuthorIds") Collection<Long> excludeAuthorIds,
            Pageable pageable);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Post p SET p.viewCount = p.viewCount + 1 WHERE p.id = :id")
    void increaseViewCount(@Param("id") Long id);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Post p SET p.commentCount = p.commentCount + 1 WHERE p.id = :postId")
    void increaseCommentCount(@Param("postId") Long postId);

    @Modifying(clearAutomatically = true)
    @Query("UPDATE Post p SET p.commentCount = p.commentCount - 1 WHERE p.id = :postId AND p.commentCount > 0")
    void decreaseCommentCount(@Param("postId") Long postId);
}
