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
    private String profileImageUrl;
    private LocalDateTime joinedAt;
    private LocalDateTime lastReadAt;
    /** 채팅방 나가기 시각 (null이면 아직 참여 중) */
    private LocalDateTime leftAt;

    public static ChatMemberDto from(ChatMember member, String nickname, String profileImageUrl) {
        return ChatMemberDto.builder()
                .id(member.getId())
                .userId(member.getUserId())
                .nickname(nickname)
                .profileImageUrl(profileImageUrl)
                .joinedAt(member.getJoinedAt())
                .lastReadAt(member.getLastReadAt())
                .leftAt(member.getLeftAt())
                .build();
    }
}
