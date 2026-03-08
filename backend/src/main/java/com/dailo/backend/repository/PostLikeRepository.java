package com.dailo.backend.repository;

import com.dailo.backend.entity.PostLike;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.Set;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {

    Optional<PostLike> findByMemberIdAndPostId(Long memberId, Long postId);

    boolean existsByMemberIdAndPostId(Long memberId, Long postId);

    /** 사용자가 좋아요 누른 게시글 ID 목록 (목록 API에서 liked 표시용) */
    @Query("SELECT pl.post.id FROM PostLike pl WHERE pl.member.id = :memberId")
    Set<Long> findPostIdsByMemberId(@Param("memberId") Long memberId);

    /** 사용자가 좋아요 누른 글 목록 (좋아요한 순 = 최신순, Post로 페이징) */
    @Query("SELECT pl FROM PostLike pl WHERE pl.member.id = :memberId ORDER BY pl.post.createdAt DESC")
    Page<PostLike> findByMemberIdOrderByPostCreatedAtDesc(@Param("memberId") Long memberId, Pageable pageable);
}
