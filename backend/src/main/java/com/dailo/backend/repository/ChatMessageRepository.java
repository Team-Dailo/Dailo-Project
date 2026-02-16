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

    /** lastReadAt 이후 메시지 수 (미읽음 개수) */
    long countByRoomAndCreatedAtAfter(ChatRoom room, LocalDateTime after);
}
