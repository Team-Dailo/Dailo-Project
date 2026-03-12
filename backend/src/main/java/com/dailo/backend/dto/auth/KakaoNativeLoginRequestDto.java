package com.dailo.backend.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class KakaoNativeLoginRequestDto {
    /** 카카오 네이티브 SDK(앱)에서 발급받은 액세스 토큰 */
    private String accessToken;
}
