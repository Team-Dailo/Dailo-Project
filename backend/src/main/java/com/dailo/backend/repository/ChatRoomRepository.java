package com.dailo.backend.repository;

import com.dailo.backend.domain.enums.RoomType;
import com.dailo.backend.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    // 내 채팅방 목록 (나가지 않은 방만) - fetch join으로 N+1 방지
    @Query("SELECT DISTINCT r FROM ChatRoom r " +
           "LEFT JOIN FETCH r.members m " +
           "WHERE EXISTS (SELECT m2 FROM ChatMember m2 WHERE m2.room = r AND m2.userId = :userId AND m2.leftAt IS NULL) " +
           "ORDER BY r.updatedAt DESC")
    List<ChatRoom> findMyRooms(@Param("userId") Long userId);

    // 두 사용자 간 기존 1:1 채팅방 조회 (상대가 나갔어도 방 자체는 찾음)
    @Query("SELECT r FROM ChatRoom r " +
           "WHERE r.roomType = :roomType " +
           "AND EXISTS (SELECT m1 FROM ChatMember m1 WHERE m1.room = r AND m1.userId = :userId1) " +
           "AND EXISTS (SELECT m2 FROM ChatMember m2 WHERE m2.room = r AND m2.userId = :userId2)")
    Optional<ChatRoom> findDirectRoomBetweenUsers(
            @Param("roomType") RoomType roomType,
            @Param("userId1") Long userId1,
            @Param("userId2") Long userId2);
}
