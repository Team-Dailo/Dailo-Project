package com.dailo.backend.service;

import com.dailo.backend.domain.enums.RoomType;
import com.dailo.backend.dto.ChatRoomResponseDto;
import com.dailo.backend.entity.ChatMember;
import com.dailo.backend.entity.ChatRoom;
import com.dailo.backend.repository.ChatMemberRepository;
import com.dailo.backend.repository.ChatRoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatRoomService {

    private final ChatRoomRepository chatRoomRepository;
    private final ChatMemberRepository chatMemberRepository;
    private final BlockService blockService;

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

        // 3. 기존 1:1 채팅방 있으면 재사용 (상대가 나갔어도 방 자체는 찾음)
        Optional<ChatRoom> existingRoom = chatRoomRepository.findDirectRoomBetweenUsers(
                RoomType.DIRECT, userId, targetUserId);

        if (existingRoom.isPresent()) {
            ChatRoom room = existingRoom.get();
            // 나간 멤버가 있으면 rejoin 처리
            rejoinIfNeeded(room, userId);
            rejoinIfNeeded(room, targetUserId);
            return ChatRoomResponseDto.from(room);
        }

        // 4. 새 채팅방 생성
        ChatRoom room = ChatRoom.builder().build();
        ChatRoom savedRoom = chatRoomRepository.save(room);

        // 5. 멤버 추가
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

        return ChatRoomResponseDto.from(savedRoom);
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
    public List<ChatRoomResponseDto> getMyRooms(Long userId) {
        return chatRoomRepository.findMyRooms(userId).stream()
                .map(ChatRoomResponseDto::from)
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

        return ChatRoomResponseDto.from(room);
    }
}
