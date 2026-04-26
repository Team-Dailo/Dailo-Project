package com.dailo.backend.dto;

import com.dailo.backend.domain.enums.RoomType;
import com.dailo.backend.entity.ChatRoom;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Getter
@Builder
public class ChatRoomResponseDto {

    private Long id;
    private RoomType roomType;
    private List<ChatMemberDto> members;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    /** 내가 읽지 않은 메시지 수 (lastReadAt 이후 메시지) */
    private Integer unreadCount;
    /** 채팅 목록용: 마지막 메시지 내용 (없으면 null) */
    private String lastMessageContent;
    /** 채팅 목록용: 마지막 메시지 시각 (없으면 null) */
    private LocalDateTime lastMessageAt;

    public static ChatRoomResponseDto from(ChatRoom room, Map<Long, String> nicknameByUserId,
                                          Map<Long, String> profileImageUrlByUserId, Integer unreadCount,
                                          String lastMessageContent, LocalDateTime lastMessageAt) {
        List<ChatMemberDto> activeMembers = room.getMembers().stream()
                .map(m -> ChatMemberDto.from(
                        m,
                        nicknameByUserId.getOrDefault(m.getUserId(), null),
                        profileImageUrlByUserId.getOrDefault(m.getUserId(), null)
                ))
                .collect(Collectors.toList());
        return ChatRoomResponseDto.builder()
                .id(room.getId())
                .roomType(room.getRoomType())
                .members(activeMembers)
                .createdAt(room.getCreatedAt())
                .updatedAt(room.getUpdatedAt())
                .unreadCount(unreadCount != null ? unreadCount : 0)
                .lastMessageContent(lastMessageContent)
                .lastMessageAt(lastMessageAt)
                .build();
    }
}
