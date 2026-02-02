package com.dailo.backend.repository;

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

    // directRoomKey로 1:1 채팅방 조회 (DB 유니크 키 방식)
    Optional<ChatRoom> findByDirectRoomKey(String directRoomKey);
}
