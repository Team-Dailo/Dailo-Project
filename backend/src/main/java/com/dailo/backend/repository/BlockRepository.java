package com.dailo.backend.repository;

import com.dailo.backend.entity.Block;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BlockRepository extends JpaRepository<Block, Long> {

    // 특정 차단 관계 조회
    Optional<Block> findByBlockerIdAndBlockedId(Long blockerId, Long blockedId);

    // 내가 차단한 목록
    List<Block> findByBlockerId(Long blockerId);

    // 차단 여부 확인 (단방향)
    boolean existsByBlockerIdAndBlockedId(Long blockerId, Long blockedId);

    // 상호 차단 여부 확인 (A→B 또는 B→A)
    @Query("SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END FROM Block b " +
           "WHERE (b.blockerId = :userId1 AND b.blockedId = :userId2) " +
           "OR (b.blockerId = :userId2 AND b.blockedId = :userId1)")
    boolean existsBlockBetween(@Param("userId1") Long userId1, @Param("userId2") Long userId2);

    // 내가 차단한 사용자 ID 목록
    @Query("SELECT b.blockedId FROM Block b WHERE b.blockerId = :userId")
    List<Long> findIdsUserBlocked(@Param("userId") Long userId);

    // 나를 차단한 사용자 ID 목록
    @Query("SELECT b.blockerId FROM Block b WHERE b.blockedId = :userId")
    List<Long> findIdsWhoBlockedUser(@Param("userId") Long userId);
}
