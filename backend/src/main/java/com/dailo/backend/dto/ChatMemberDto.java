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
    /** 채팅 목록/채팅방에서 표시할 닉네임 (Member 테이블 조회) */
    private String nickname;
    private LocalDateTime joinedAt;
    private LocalDateTime lastReadAt;

    public static ChatMemberDto from(ChatMember member) {
        return ChatMemberDto.builder()
                .id(member.getId())
                .userId(member.getUserId())
                .nickname(null)
                .joinedAt(member.getJoinedAt())
                .lastReadAt(member.getLastReadAt())
                .build();
    }

    /** 닉네임을 넣어서 빌드 (서비스 레이어에서 Member 조회 후 사용) */
    public static ChatMemberDto from(ChatMember member, String nickname) {
        return ChatMemberDto.builder()
                .id(member.getId())
                .userId(member.getUserId())
                .nickname(nickname)
                .joinedAt(member.getJoinedAt())
                .lastReadAt(member.getLastReadAt())
                .build();
    }
}
