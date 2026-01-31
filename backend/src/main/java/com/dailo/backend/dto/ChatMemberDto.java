package com.dailo.backend.dto;

import com.dailo.backend.entity.ChatMember;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class ChatMemberDto {

    private Long id;
    private Long userId;
    private LocalDateTime joinedAt;
    private LocalDateTime lastReadAt;

    public static ChatMemberDto from(ChatMember member) {
        return ChatMemberDto.builder()
                .id(member.getId())
                .userId(member.getUserId())
                .joinedAt(member.getJoinedAt())
                .lastReadAt(member.getLastReadAt())
                .build();
    }
}
