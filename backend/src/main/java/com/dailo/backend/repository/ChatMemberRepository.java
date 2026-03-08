package com.dailo.backend.repository;

import com.dailo.backend.entity.ChatMember;
import com.dailo.backend.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatMemberRepository extends JpaRepository<ChatMember, Long> {

    // 특정 방의 특정 사용자 조회
    Optional<ChatMember> findByRoomAndUserId(ChatRoom room, Long userId);

    // 특정 방의 모든 멤버 조회
    List<ChatMember> findByRoom(ChatRoom room);

    // 특정 방의 활성 멤버만 조회 (나가지 않은)
    List<ChatMember> findByRoomAndLeftAtIsNull(ChatRoom room);

    // 특정 사용자가 속한 모든 방 멤버 정보
    List<ChatMember> findByUserIdAndLeftAtIsNull(Long userId);

    // 1:1 채팅에서 상대방 조회
    @Query("SELECT m FROM ChatMember m WHERE m.room = :room AND m.userId <> :userId AND m.leftAt IS NULL")
    Optional<ChatMember> findOtherMember(@Param("room") ChatRoom room, @Param("userId") Long userId);
}
