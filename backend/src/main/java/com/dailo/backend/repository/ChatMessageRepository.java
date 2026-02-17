package com.dailo.backend.repository;

import com.dailo.backend.entity.ChatMessage;
import com.dailo.backend.entity.ChatRoom;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    // 채팅방 메시지 조회 (페이징, 최신순)
    Page<ChatMessage> findByRoomOrderByCreatedAtDesc(ChatRoom room, Pageable pageable);

    // 채팅방 메시지 조회 (페이징, 오래된순 - 채팅 UI용)
    Page<ChatMessage> findByRoomOrderByCreatedAtAsc(ChatRoom room, Pageable pageable);
}
