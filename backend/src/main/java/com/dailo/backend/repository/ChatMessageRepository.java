package com.dailo.backend.repository;

import com.dailo.backend.entity.ChatMessage;
import com.dailo.backend.entity.ChatRoom;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    Page<ChatMessage> findByRoomOrderByCreatedAtDesc(ChatRoom room, Pageable pageable);
    Page<ChatMessage> findByRoomOrderByCreatedAtAsc(ChatRoom room, Pageable pageable);

    /** lastReadAt 이후 메시지 수 (미읽음 개수) - 내가 보낸 메시지 제외 */
    long countByRoomAndCreatedAtAfterAndSenderIdNot(ChatRoom room, LocalDateTime after, Long senderId);

    /** 방의 모든 메시지 삭제 */
    void deleteByRoom(ChatRoom room);

}
