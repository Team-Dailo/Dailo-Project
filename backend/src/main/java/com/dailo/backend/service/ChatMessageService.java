package com.dailo.backend.service;

import com.dailo.backend.domain.enums.MessageType;
import com.dailo.backend.dto.ChatMessageResponseDto;
import com.dailo.backend.entity.ChatMember;
import com.dailo.backend.entity.ChatMessage;
import com.dailo.backend.entity.ChatRoom;
import com.dailo.backend.entity.Member;
import com.dailo.backend.repository.ChatMemberRepository;
import com.dailo.backend.repository.ChatMessageRepository;
import com.dailo.backend.repository.ChatRoomRepository;
import com.dailo.backend.repository.MemberRepository;
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
    private final MemberRepository memberRepository; // 💡 추가: 이메일 조회를 위해 주입
    private final BlockService blockService;

    // 💡 이메일로 내 ID를 찾아주는 헬퍼 메서드
    private Long getMemberIdByEmail(String email) {
        if (email == null) return null;
        return memberRepository.findByEmail(email)
                .map(Member::getId)
                .orElseThrow(() -> new RuntimeException("Member not found for email: " + email));
    }

    // 메시지 전송
    @Transactional
    public ChatMessageResponseDto sendMessage(Long roomId, String email, String content, MessageType messageType) {
        Long senderId = getMemberIdByEmail(email);
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

        // 4. 채팅방 타임스탬프 갱신 (목록 정렬용)
        room.updateTimestamp();

        return ChatMessageResponseDto.from(savedMessage);
    }

    // 메시지 히스토리 조회
    public Page<ChatMessageResponseDto> getMessages(Long roomId, String email, Pageable pageable) {
        Long userId = getMemberIdByEmail(email);

        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found: " + roomId));

        // 멤버 여부 확인
        ChatMember member = chatMemberRepository.findByRoomAndUserId(room, userId)
                .orElseThrow(() -> new RuntimeException("You are not a member of this room"));

        return chatMessageRepository.findByRoomOrderByCreatedAtDesc(room, pageable)
                .map(ChatMessageResponseDto::from);
    }
}