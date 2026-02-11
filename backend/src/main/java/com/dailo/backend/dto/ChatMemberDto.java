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
    private String nickname;  // 채팅 목록에서 상대방 이름 표시용
    private LocalDateTime joinedAt;
    private LocalDateTime lastReadAt;

    public static ChatMemberDto from(ChatMember member) {
        return from(member, null);
    }

    public static ChatMemberDto from(ChatMember member, String nickname) {
        return ChatMemberDto.builder()
                .id(member.getId())
                .userId(member.getUserId())
                .nickname(nickname != null && !nickname.isBlank() ? nickname : ("user_" + member.getUserId()))
                .joinedAt(member.getJoinedAt())
                .lastReadAt(member.getLastReadAt())
                .build();
    }
}
