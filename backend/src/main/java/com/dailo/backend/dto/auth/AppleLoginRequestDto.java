package com.dailo.backend.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class AppleLoginRequestDto {

    /**
     * Apple에서 발급한 identityToken (JWT 형식)
     * 프론트엔드에서 AppleAuthentication.signInAsync()로 받은 credential.identityToken
     */
    private String identityToken;

    /**
     * Apple User Identifier
     * credential.user - 고유 사용자 식별자
     */
    private String user;

    /**
     * 사용자 이름 (최초 로그인 시에만 제공됨)
     * credential.fullName.givenName + familyName
     */
    private String fullName;

    /**
     * 사용자 이메일 (최초 로그인 시 또는 이메일 공개 선택 시 제공)
     * 이메일 숨기기 선택 시 Apple의 프라이빗 릴레이 이메일 제공
     */
    private String email;
}
