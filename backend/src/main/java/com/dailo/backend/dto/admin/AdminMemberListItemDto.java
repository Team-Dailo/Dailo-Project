package com.dailo.backend.dto.admin;

import com.dailo.backend.entity.Member;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AdminMemberListItemDto {
    private Long id;
    private String email;
    private String nickname;
    private String role;
    private String status;
    private LocalDateTime createdAt;

    public static AdminMemberListItemDto from(Member member) {
        return AdminMemberListItemDto.builder()
                .id(member.getId())
                .email(member.getEmail())
                .nickname(member.getNickname())
                .role(member.getRole() != null ? member.getRole().name() : null)
                .status(member.getStatus() != null ? member.getStatus().name() : null)
                .createdAt(member.getCreatedAt())
                .build();
    }
}
