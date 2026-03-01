package com.dailo.backend.service;

import com.dailo.backend.dto.ChatRoomResponseDto;
import com.dailo.backend.entity.ChatMember;
import com.dailo.backend.entity.ChatMessage;
import com.dailo.backend.entity.ChatRoom;
import com.dailo.backend.entity.Member;
import com.dailo.backend.repository.ChatMemberRepository;
import com.dailo.backend.repository.ChatMessageRepository;
import com.dailo.backend.repository.ChatRoomRepository;
import com.dailo.backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatRoomService {

    private final ChatRoomRepository chatRoomRepository;
    private final ChatMemberRepository chatMemberRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final MemberRepository memberRepository;
    private final BlockService blockService;

    // 이메일로 내 ID를 찾아주는 헬퍼 메서드
    private Long getMyIdByEmail(String email) {
        return memberRepository.findByEmail(email)
                .map(Member::getId)
                .orElseThrow(() -> new RuntimeException("Member not found: " + email));
    }

    // 채팅방 생성 (1:1)
    @Transactional
    public ChatRoomResponseDto createRoom(String email, Long targetUserId) {
        Long userId = getMyIdByEmail(email);

        // 1. 자기 자신과 채팅 불가
        if (userId.equals(targetUserId)) {
            throw new RuntimeException("Cannot create chat room with yourself");
        }

        // 2. 차단 여부 확인
        if (blockService.isBlockedEither(userId, targetUserId)) {
            throw new RuntimeException("Cannot create chat room with blocked user");
        }

        // 3. directRoomKey 생성
        String directRoomKey = generateDirectRoomKey(userId, targetUserId);

        // 4. 기존 1:1 채팅방 있으면 재사용
        Optional<ChatRoom> existingRoom = chatRoomRepository.findByDirectRoomKey(directRoomKey);

        if (existingRoom.isPresent()) {
            ChatRoom room = existingRoom.get();
            rejoinIfNeeded(room, userId);
            rejoinIfNeeded(room, targetUserId);
            return enrichRoom(room, userId);
        }

        // 5. 새 채팅방 생성 시도
        try {
            ChatRoom room = ChatRoom.builder()
                    .directRoomKey(directRoomKey)
                    .build();
            ChatRoom savedRoom = chatRoomRepository.save(room);

            // 6. 멤버 추가
            ChatMember member1 = ChatMember.builder()
                    .room(savedRoom)
                    .userId(userId)
                    .build();
            ChatMember member2 = ChatMember.builder()
                    .room(savedRoom)
                    .userId(targetUserId)
                    .build();

            chatMemberRepository.save(member1);
            chatMemberRepository.save(member2);

            return enrichRoom(savedRoom, userId);
        } catch (DataIntegrityViolationException e) {
            return chatRoomRepository.findByDirectRoomKey(directRoomKey)
                    .map(room -> {
                        rejoinIfNeeded(room, userId);
                        rejoinIfNeeded(room, targetUserId);
                        return enrichRoom(room, userId);
                    })
                    .orElseThrow(() -> new RuntimeException("Failed to create or find chat room"));
        }
    }

    /** 닉네임 + 미읽음 수 + 마지막 메시지 채워서 DTO 반환 */
    private ChatRoomResponseDto enrichRoom(ChatRoom room, Long myUserId) {
        List<Long> userIds = room.getMembers().stream()
                .filter(m -> m.getLeftAt() == null)
                .map(ChatMember::getUserId)
                .distinct()
                .collect(Collectors.toList());

        Map<Long, String> nicknameMap = userIds.isEmpty() ? Map.of() : memberRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(Member::getId, m -> m.getNickname() != null ? m.getNickname() : ""));

        LocalDateTime lastRead = chatMemberRepository.findByRoomAndUserId(room, myUserId)
                .map(ChatMember::getLastReadAt)
                .orElse(LocalDateTime.MIN);

        int unread = (int) chatMessageRepository.countByRoomAndCreatedAtAfter(room, lastRead);

        Optional<ChatMessage> lastMsg = chatMessageRepository
                .findByRoomOrderByCreatedAtDesc(room, PageRequest.of(0, 1))
                .stream().findFirst();

        String lastContent = lastMsg.map(ChatMessage::getContent).orElse(null);
        LocalDateTime lastAt = lastMsg.map(ChatMessage::getCreatedAt).orElse(null);

        return ChatRoomResponseDto.from(room, nicknameMap, unread, lastContent, lastAt);
    }

    private String generateDirectRoomKey(Long userId1, Long userId2) {
        long min = Math.min(userId1, userId2);
        long max = Math.max(userId1, userId2);
        return "DIRECT:" + min + ":" + max;
    }

    private void rejoinIfNeeded(ChatRoom room, Long userId) {
        chatMemberRepository.findByRoomAndUserId(room, userId)
                .ifPresent(member -> {
                    if (!member.isActive()) {
                        member.rejoin();
                    }
                });
    }

    // 내 채팅방 목록
    public List<ChatRoomResponseDto> getMyRooms(String email) {
        Long userId = getMyIdByEmail(email);

        List<ChatRoom> rooms = chatRoomRepository.findMyRooms(userId);
        List<Long> allUserIds = rooms.stream()
                .flatMap(r -> r.getMembers().stream())
                .filter(m -> m.getLeftAt() == null)
                .map(ChatMember::getUserId)
                .distinct()
                .collect(Collectors.toList());

        Map<Long, String> nicknameMap = allUserIds.isEmpty() ? Map.of() : memberRepository.findAllById(allUserIds).stream()
                .collect(Collectors.toMap(Member::getId, m -> m.getNickname() != null ? m.getNickname() : ""));

        return rooms.stream().map(room -> {
            LocalDateTime lastRead = chatMemberRepository.findByRoomAndUserId(room, userId)
                    .map(ChatMember::getLastReadAt)
                    .orElse(LocalDateTime.MIN);
            int unread = (int) chatMessageRepository.countByRoomAndCreatedAtAfter(room, lastRead);
            Optional<ChatMessage> lastMsg = chatMessageRepository
                    .findByRoomOrderByCreatedAtDesc(room, PageRequest.of(0, 1))
                    .stream().findFirst();
            String lastContent = lastMsg.map(ChatMessage::getContent).orElse(null);
            LocalDateTime lastAt = lastMsg.map(ChatMessage::getCreatedAt).orElse(null);
            return ChatRoomResponseDto.from(room, nicknameMap, unread, lastContent, lastAt);
        }).collect(Collectors.toList());
    }

    @Transactional
    public void markAsRead(Long roomId, String email) {
        Long userId = getMyIdByEmail(email);

        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found: " + roomId));
        ChatMember member = chatMemberRepository.findByRoomAndUserId(room, userId)
                .orElseThrow(() -> new RuntimeException("You are not a member of this room"));
        if (member.isActive()) {
            member.updateLastReadAt();
        }
    }

    @Transactional
    public void leaveRoom(Long roomId, String email) {
        Long userId = getMyIdByEmail(email);

        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found: " + roomId));

        ChatMember member = chatMemberRepository.findByRoomAndUserId(room, userId)
                .orElseThrow(() -> new RuntimeException("You are not a member of this room"));

        if (!member.isActive()) {
            throw new RuntimeException("Already left this room");
        }

        member.leave();
    }

    public ChatRoomResponseDto getRoom(Long roomId, String email) {
        Long userId = getMyIdByEmail(email);

        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found: " + roomId));

        ChatMember member = chatMemberRepository.findByRoomAndUserId(room, userId)
                .orElseThrow(() -> new RuntimeException("You are not a member of this room"));

        if (!member.isActive()) {
            throw new RuntimeException("You have left this room");
        }

        return enrichRoom(room, userId);
    }
}