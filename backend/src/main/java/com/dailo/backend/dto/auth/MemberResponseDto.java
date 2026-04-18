package com.dailo.backend.dto.auth;

import com.dailo.backend.entity.Member;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MemberResponseDto {
    private Long id;
    private String email;
    private String nickname;
    private String profileImageUrl;
    private String role;

    public static MemberResponseDto of(Member member, String resolvedProfileImageUrl) {
        return MemberResponseDto.builder()
                .id(member.getId())
                .email(member.getEmail())
                .nickname(member.getNickname())
                .profileImageUrl(resolvedProfileImageUrl)
                .role(member.getRole() != null ? member.getRole().name() : null)
                .build();
    }
}