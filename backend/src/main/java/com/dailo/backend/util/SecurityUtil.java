package com.dailo.backend.util;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * JWT 인증된 현재 사용자 정보 조회.
 * CustomUserDetailsService에서 principal name = member.getId() 로 설정됨.
 */
public final class SecurityUtil {

    /** 현재 로그인한 회원 ID. 없거나 파싱 실패 시 null */
    public static Long getCurrentMemberId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || !auth.isAuthenticated()) {
            return null;
        }
        try {
            return Long.parseLong(auth.getName());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
