package com.dailo.backend.service;

import com.dailo.backend.domain.enums.MessageType;
import com.dailo.backend.dto.ChatMessageResponseDto;
import com.dailo.backend.entity.ChatMember;
import com.dailo.backend.entity.ChatMessage;
import com.dailo.backend.entity.ChatRoom;
import com.dailo.backend.repository.ChatMemberRepository;
import com.dailo.backend.repository.ChatMessageRepository;
import com.dailo.backend.repository.ChatRoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatMessageService {

    private final ChatMessageRepository chatMessageRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final ChatMemberRepository chatMemberRepository;
    private final BlockService blockService;

    // 메시지 전송
    @Transactional
    public ChatMessageResponseDto sendMessage(Long roomId, Long senderId, String content, MessageType messageType) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found: " + roomId));

        // 1. 멤버 여부 확인
        ChatMember sender = chatMemberRepository.findByRoomAndUserId(room, senderId)
                .orElseThrow(() -> new RuntimeException("You are not a member of this room"));

        if (!sender.isActive()) {
            throw new RuntimeException("You have left this room");
        }

        // 2. 1:1 채팅에서 상대방과 차단 여부 확인
        chatMemberRepository.findOtherMember(room, senderId)
                .ifPresent(otherMember -> {
                    if (blockService.isBlockedEither(senderId, otherMember.getUserId())) {
                        throw new RuntimeException("Cannot send message to blocked user");
                    }
                });

        // 3. 메시지 저장
        ChatMessage message = ChatMessage.builder()
                .room(room)
                .senderId(senderId)
                .content(content)
                .messageType(messageType != null ? messageType : MessageType.TEXT)
                .build();

        ChatMessage savedMessage = chatMessageRepository.save(message);

        return ChatMessageResponseDto.from(savedMessage);
    }

    // 메시지 히스토리 조회
    public Page<ChatMessageResponseDto> getMessages(Long roomId, Long userId, Pageable pageable) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found: " + roomId));

        // 멤버 여부 확인
        ChatMember member = chatMemberRepository.findByRoomAndUserId(room, userId)
                .orElseThrow(() -> new RuntimeException("You are not a member of this room"));

        // 나간 사용자도 이전 메시지는 볼 수 있음 (정책에 따라 변경 가능)

        return chatMessageRepository.findByRoomOrderByCreatedAtDesc(room, pageable)
                .map(ChatMessageResponseDto::from);
    }
}
