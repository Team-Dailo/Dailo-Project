package com.dailo.backend.support;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.List;

/**
 * 테스트용 SecurityContext 설정 유틸리티
 *
 * 모든 통합 테스트에서 공통으로 사용하는 인증 설정 메서드를 제공합니다.
 * @AuthenticationPrincipal UserDetails와 SecurityUtil.getCurrentMemberEmail() 모두 호환됩니다.
 */
public final class TestSecurityUtils {

    private TestSecurityUtils() {
        // Utility class - 인스턴스화 방지
    }

    /**
     * 지정된 이메일로 SecurityContext에 인증 정보를 설정합니다.
     *
     * @param email 인증할 사용자의 이메일
     */
    public static void authenticate(String email) {
        authenticate(email, "ROLE_USER");
    }

    /**
     * 지정된 이메일과 권한으로 SecurityContext에 인증 정보를 설정합니다.
     *
     * @param email 인증할 사용자의 이메일
     * @param role 부여할 권한 (예: "ROLE_USER", "ROLE_ADMIN")
     */
    public static void authenticate(String email, String role) {
        UserDetails userDetails = User.builder()
                .username(email)
                .password("")
                .authorities(List.of(new SimpleGrantedAuthority(role)))
                .build();

        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    /**
     * SecurityContext의 인증 정보를 제거합니다.
     * 테스트 종료 시 @AfterEach에서 호출해야 합니다.
     */
    public static void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }
}
