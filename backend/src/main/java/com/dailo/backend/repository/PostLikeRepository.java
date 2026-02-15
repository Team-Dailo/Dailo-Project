package com.dailo.backend.repository;

import com.dailo.backend.entity.PostLike;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {

    Optional<PostLike> findByMemberIdAndPostId(Long memberId, Long postId);

    boolean existsByMemberIdAndPostId(Long memberId, Long postId);
}
