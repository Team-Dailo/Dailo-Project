package com.dailo.backend.service;

import com.dailo.backend.dto.ChatRoomResponseDto;
import com.dailo.backend.entity.ChatMember;
import com.dailo.backend.entity.ChatRoom;
import com.dailo.backend.repository.ChatMemberRepository;
import com.dailo.backend.repository.ChatRoomRepository;
import com.dailo.backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
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
    private final BlockService blockService;
    private final MemberRepository memberRepository;

    // 채팅방 생성 (1:1)
    @Transactional
    public ChatRoomResponseDto createRoom(Long userId, Long targetUserId) {
        // 1. 자기 자신과 채팅 불가
        if (userId.equals(targetUserId)) {
            throw new RuntimeException("Cannot create chat room with yourself");
        }

        // 2. 차단 여부 확인
        if (blockService.isBlockedEither(userId, targetUserId)) {
            throw new RuntimeException("Cannot create chat room with blocked user");
        }

        // 3. directRoomKey 생성 (정렬하여 일관된 키)
        String directRoomKey = generateDirectRoomKey(userId, targetUserId);

        // 4. 기존 1:1 채팅방 있으면 재사용
        Optional<ChatRoom> existingRoom = chatRoomRepository.findByDirectRoomKey(directRoomKey);

        if (existingRoom.isPresent()) {
            ChatRoom room = existingRoom.get();
            // 나간 멤버가 있으면 rejoin 처리
            rejoinIfNeeded(room, userId);
            rejoinIfNeeded(room, targetUserId);
            return toDtoWithNicknames(room);
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

            return toDtoWithNicknames(savedRoom);
        } catch (DataIntegrityViolationException e) {
            // 동시 생성으로 인한 유니크 제약 위반 시 기존 방 반환
            return chatRoomRepository.findByDirectRoomKey(directRoomKey)
                    .map(room -> {
                        rejoinIfNeeded(room, userId);
                        rejoinIfNeeded(room, targetUserId);
                        return toDtoWithNicknames(room);
                    })
                    .orElseThrow(() -> new RuntimeException("Failed to create or find chat room"));
        }
    }

    private ChatRoomResponseDto toDtoWithNicknames(ChatRoom room) {
        Map<Long, String> nicknameMap = new HashMap<>();
        room.getMembers().stream()
                .filter(m -> m.getLeftAt() == null)
                .map(ChatMember::getUserId)
                .distinct()
                .forEach(uid -> memberRepository.findById(uid)
                        .ifPresent(m -> nicknameMap.put(uid, m.getNickname() != null && !m.getNickname().isBlank() ? m.getNickname() : ("user_" + uid))));
        return ChatRoomResponseDto.fromWithNicknames(room, nicknameMap);
    }

    // directRoomKey 생성 (DIRECT:minUserId:maxUserId)
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

    // 내 채팅방 목록 (멤버 닉네임 포함)
    public List<ChatRoomResponseDto> getMyRooms(Long userId) {
        return chatRoomRepository.findMyRooms(userId).stream()
                .map(this::toDtoWithNicknames)
                .collect(Collectors.toList());
    }

    // 채팅방 나가기
    @Transactional
    public void leaveRoom(Long roomId, Long userId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found: " + roomId));

        ChatMember member = chatMemberRepository.findByRoomAndUserId(room, userId)
                .orElseThrow(() -> new RuntimeException("You are not a member of this room"));

        if (!member.isActive()) {
            throw new RuntimeException("Already left this room");
        }

        member.leave();
    }

    // 채팅방 상세 조회
    public ChatRoomResponseDto getRoom(Long roomId, Long userId) {
        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found: " + roomId));

        // 멤버 여부 확인
        ChatMember member = chatMemberRepository.findByRoomAndUserId(room, userId)
                .orElseThrow(() -> new RuntimeException("You are not a member of this room"));

        if (!member.isActive()) {
            throw new RuntimeException("You have left this room");
        }

        return toDtoWithNicknames(room);
    }
}
