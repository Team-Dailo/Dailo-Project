package com.dailo.backend.util;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * JWT 인증된 현재 사용자 정보 조회.
 * 현재 토큰의 Subject(name)에는 유저의 이메일(String)이 들어있습니다.
 */
public final class SecurityUtil {

    /** 현재 로그인한 회원의 이메일 조회. 없거나 비로그인 시 null 반환 */
    public static String getCurrentMemberEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        // 인증 정보가 없거나, 익명 사용자(비로그인)일 경우 null 반환
        if (auth == null || auth.getName() == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getName())) {
            return null;
        }

        // 더 이상 Long으로 파싱하지 않고 이메일(String)을 그대로 반환
        return auth.getName();
    }
}