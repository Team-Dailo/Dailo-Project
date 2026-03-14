package com.dailo.backend.dto.auth;

import com.dailo.backend.entity.Member;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 타 사용자 프로필 조회용 DTO (이메일 미포함)
 */
@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MemberProfileResponseDto {
    private Long id;
    private String nickname;
    private String profileImageUrl;

    public static MemberProfileResponseDto of(Member member, String resolvedProfileImageUrl) {
        return MemberProfileResponseDto.builder()
                .id(member.getId())
                .nickname(member.getNickname())
                .profileImageUrl(resolvedProfileImageUrl)
                .build();
    }
}
