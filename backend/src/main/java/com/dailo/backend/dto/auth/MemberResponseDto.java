package com.dailo.backend.dto.auth;

import com.dailo.backend.entity.Member;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@AllArgsConstructor
@NoArgsConstructor
public class MemberResponseDto {
    private String email;
    private String nickname;

    public static MemberResponseDto of(Member member) {
        return new MemberResponseDto(member.getEmail(), member.getNickname());
    }
}