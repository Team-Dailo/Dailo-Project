package com.dailo.backend.repository;

import com.dailo.backend.entity.CommentLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.Set;

@Repository
public interface CommentLikeRepository extends JpaRepository<CommentLike, Long> {

    Optional<CommentLike> findByMemberIdAndCommentId(Long memberId, Long commentId);

    boolean existsByMemberIdAndCommentId(Long memberId, Long commentId);

    /** 특정 댓글 목록에서 사용자가 좋아요 누른 댓글 ID 목록 */
    @Query("SELECT cl.comment.id FROM CommentLike cl WHERE cl.member.id = :memberId AND cl.comment.id IN :commentIds")
    Set<Long> findLikedCommentIds(@Param("memberId") Long memberId, @Param("commentIds") Set<Long> commentIds);
}
