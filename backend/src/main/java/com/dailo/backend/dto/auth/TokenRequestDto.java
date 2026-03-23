package com.dailo.backend.dto.auth;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class TokenRequestDto {

    // 재발급은 refresh token만 받도록 단순화
    private String refreshToken;
}