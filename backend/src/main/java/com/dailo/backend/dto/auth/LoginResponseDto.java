package com.dailo.backend.dto.auth;

import com.dailo.backend.jwt.TokenDto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 로그인 API 응답.
 * - 일반 로그인: tokenDto 있음, requiresEmailVerification false
 * - 관리자 이메일 확인 로그인: tokenDto null, requiresEmailVerification true
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoginResponseDto {
    private TokenDto tokenDto;
    private boolean requiresEmailVerification;
    private String message;

    public static LoginResponseDto withToken(TokenDto tokenDto) {
        return LoginResponseDto.builder()
                .tokenDto(tokenDto)
                .requiresEmailVerification(false)
                .message(null)
                .build();
    }

    public static LoginResponseDto emailVerificationRequired(String message) {
        return LoginResponseDto.builder()
                .tokenDto(null)
                .requiresEmailVerification(true)
                .message(message != null ? message : "이메일에서 확인 링크를 눌러 주세요.")
                .build();
    }
}
