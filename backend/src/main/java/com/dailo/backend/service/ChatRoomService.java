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
import java.util.HashMap;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatRoomService {

    private final ChatRoomRepository chatRoomRepository;
    private final ChatMemberRepository chatMemberRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final MemberRepository memberRepository;
    private final BlockService blockService;
    private final S3UploadService s3UploadService;

    // principal(email 또는 memberId)로 내 ID를 찾아주는 헬퍼 메서드
    private Long getMyIdByPrincipal(String principal) {
        if (principal == null || principal.isBlank()) {
            throw new RuntimeException("인증된 사용자 정보가 없습니다.");
        }

        // 카카오 로그인 토큰 subject가 memberId인 경우 대응
        if (principal.matches("\\d+")) {
            Long memberId = Long.valueOf(principal);
            return memberRepository.findById(memberId)
                    .map(Member::getId)
                    .orElseThrow(() -> new RuntimeException("Member not found: id=" + memberId));
        }

        // 일반 로그인(email subject) 대응
        return memberRepository.findByEmail(principal)
                .map(Member::getId)
                .orElseThrow(() -> new RuntimeException("Member not found: " + principal));
    }

    // 채팅방 생성 (1:1)
    @Transactional
    public ChatRoomResponseDto createRoom(String email, Long targetUserId) {
        Long userId = getMyIdByPrincipal(email);

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

    /** 닉네임 + 프로필 이미지 + 미읽음 수 + 마지막 메시지 채워서 DTO 반환 */
    private ChatRoomResponseDto enrichRoom(ChatRoom room, Long myUserId) {
        List<Long> userIds = room.getMembers().stream()
                .filter(m -> m.getLeftAt() == null)
                .map(ChatMember::getUserId)
                .distinct()
                .collect(Collectors.toList());

        List<Member> members = userIds.isEmpty() ? List.of() : memberRepository.findAllById(userIds);
        Map<Long, String> nicknameMap = members.stream()
                .collect(Collectors.toMap(Member::getId, m -> m.getNickname() != null ? m.getNickname() : ""));
        Map<Long, String> profileImageUrlMap = buildProfileImageUrlMap(members);

        LocalDateTime lastRead = chatMemberRepository.findByRoomAndUserId(room, myUserId)
                .map(ChatMember::getLastReadAt)
                .orElse(LocalDateTime.of(1970, 1, 1, 0, 0, 0));

        int unread = (int) chatMessageRepository.countByRoomAndCreatedAtAfterAndSenderIdNot(room, lastRead, myUserId);

        Optional<ChatMessage> lastMsg = chatMessageRepository
                .findByRoomOrderByCreatedAtDesc(room, PageRequest.of(0, 1))
                .stream().findFirst();

        String lastContent = lastMsg.map(ChatMessage::getContent).orElse(null);
        LocalDateTime lastAt = lastMsg.map(ChatMessage::getCreatedAt).orElse(null);

        return ChatRoomResponseDto.from(room, nicknameMap, profileImageUrlMap, unread, lastContent, lastAt);
    }

    private Map<Long, String> buildProfileImageUrlMap(List<Member> members) {
        Map<Long, String> map = new HashMap<>();
        for (Member m : members) {
            String key = m.getProfileImageKey();
            String ext = m.getProfileImageExternalUrl();
            String url = null;
            if (key != null && !key.isBlank()) {
                if (key.startsWith("/")) {
                    url = key;
                } else {
                    try {
                        url = s3UploadService.getPresignedUrl(key);
                    } catch (Exception ignored) {}
                }
            } else if (ext != null && !ext.isBlank()) {
                url = ext;
            }
            map.put(m.getId(), url);
        }
        return map;
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
        Long userId = getMyIdByPrincipal(email);

        List<ChatRoom> rooms = chatRoomRepository.findMyRooms(userId);
        List<Long> allUserIds = rooms.stream()
                .flatMap(r -> r.getMembers().stream())
                .filter(m -> m.getLeftAt() == null)
                .map(ChatMember::getUserId)
                .distinct()
                .collect(Collectors.toList());

        List<Member> allMembers = allUserIds.isEmpty() ? List.of() : memberRepository.findAllById(allUserIds);
        Map<Long, String> nicknameMap = allMembers.stream()
                .collect(Collectors.toMap(Member::getId, m -> m.getNickname() != null ? m.getNickname() : ""));
        Map<Long, String> profileImageUrlMap = buildProfileImageUrlMap(allMembers);

        return rooms.stream().map(room -> {
            LocalDateTime lastRead = chatMemberRepository.findByRoomAndUserId(room, userId)
                    .map(ChatMember::getLastReadAt)
                    .orElse(LocalDateTime.of(1970, 1, 1, 0, 0, 0));
            int unread = (int) chatMessageRepository.countByRoomAndCreatedAtAfterAndSenderIdNot(room, lastRead, userId);
            Optional<ChatMessage> lastMsg = chatMessageRepository
                    .findByRoomOrderByCreatedAtDesc(room, PageRequest.of(0, 1))
                    .stream().findFirst();
            String lastContent = lastMsg.map(ChatMessage::getContent).orElse(null);
            LocalDateTime lastAt = lastMsg.map(ChatMessage::getCreatedAt).orElse(null);
            return ChatRoomResponseDto.from(room, nicknameMap, profileImageUrlMap, unread, lastContent, lastAt);
        }).collect(Collectors.toList());
    }

    @Transactional
    public void markAsRead(Long roomId, String email) {
        Long userId = getMyIdByPrincipal(email);

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
        Long userId = getMyIdByPrincipal(email);

        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found: " + roomId));

        ChatMember member = chatMemberRepository.findByRoomAndUserId(room, userId)
                .orElseThrow(() -> new RuntimeException("You are not a member of this room"));

        if (!member.isActive()) {
            throw new RuntimeException("Already left this room");
        }

        member.leave();
        // 재채팅 시 새 방이 생성되도록 key 초기화
        room.clearDirectRoomKey();

        // 모든 멤버가 나갔으면 방·메시지 영구 삭제
        boolean allLeft = room.getMembers().stream().allMatch(m -> !m.isActive());
        if (allLeft) {
            chatMessageRepository.deleteByRoom(room);
            chatMemberRepository.deleteAll(room.getMembers());
            chatRoomRepository.delete(room);
        }
    }

    public ChatRoomResponseDto getRoom(Long roomId, String email) {
        Long userId = getMyIdByPrincipal(email);

        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found: " + roomId));

        ChatMember member = chatMemberRepository.findByRoomAndUserId(room, userId)
                .orElseThrow(() -> new RuntimeException("You are not a member of this room"));

        if (!member.isActive()) {
            throw new RuntimeException("You have left this room");
        }

        return enrichRoom(room, userId);
    }

    // 채팅방 알림 토글
    @Transactional
    public boolean toggleNotification(Long roomId, String email) {
        Long userId = getMyIdByPrincipal(email);

        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found: " + roomId));

        ChatMember member = chatMemberRepository.findByRoomAndUserId(room, userId)
                .orElseThrow(() -> new RuntimeException("You are not a member of this room"));

        if (!member.isActive()) {
            throw new RuntimeException("You have left this room");
        }

        member.toggleMuted();
        return !member.isMuted(); // 알림 켜짐 상태 반환 (muted의 반대)
    }

    // 채팅방 알림 상태 조회
    public boolean isNotificationOn(Long roomId, String email) {
        Long userId = getMyIdByPrincipal(email);

        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found: " + roomId));

        ChatMember member = chatMemberRepository.findByRoomAndUserId(room, userId)
                .orElseThrow(() -> new RuntimeException("You are not a member of this room"));

        return !member.isMuted();
    }
}