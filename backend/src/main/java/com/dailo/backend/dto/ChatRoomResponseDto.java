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

    /** 닉네임 없이 변환 (기본) */
    public static ChatRoomResponseDto from(ChatRoom room) {
        List<ChatMemberDto> activeMembers = room.getMembers().stream()
                .filter(m -> m.getLeftAt() == null)
                .map(ChatMemberDto::from)
                .collect(Collectors.toList());
        return ChatRoomResponseDto.builder()
                .id(room.getId())
                .roomType(room.getRoomType())
                .members(activeMembers)
                .createdAt(room.getCreatedAt())
                .updatedAt(room.getUpdatedAt())
                .build();
    }

    /** userId -> nickname 맵으로 멤버 닉네임 포함 변환 */
    public static ChatRoomResponseDto fromWithNicknames(ChatRoom room, Map<Long, String> userIdToNickname) {
        List<ChatMemberDto> activeMembers = room.getMembers().stream()
                .filter(m -> m.getLeftAt() == null)
                .map(m -> ChatMemberDto.from(m, userIdToNickname != null ? userIdToNickname.get(m.getUserId()) : null))
                .collect(Collectors.toList());
        return ChatRoomResponseDto.builder()
                .id(room.getId())
                .roomType(room.getRoomType())
                .members(activeMembers)
                .createdAt(room.getCreatedAt())
                .updatedAt(room.getUpdatedAt())
                .build();
    }
}
