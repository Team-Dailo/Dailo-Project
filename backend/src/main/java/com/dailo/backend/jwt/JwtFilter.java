package com.dailo.backend.jwt;

import com.dailo.backend.repository.MemberRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    public static final String AUTHORIZATION_HEADER = "Authorization";
    public static final String BEARER_PREFIX = "Bearer ";

    private final TokenProvider tokenProvider;
    private final MemberRepository memberRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {

        // 1. Request Header에서 토큰 꺼내기
        String jwt = resolveToken(request);

        // 2. 토큰 유효성 검사
        if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
            // 3. 토큰에서 인증 정보(Authentication) 추출
            Authentication authentication = tokenProvider.getAuthentication(jwt);

            // 4. 정지 회원 체크 (이메일 기반)
            // authentication.getName()은 이제 유저의 이메일(String)입니다.
            String email = authentication.getName();

            // DB에서 해당 이메일로 회원을 찾아 정지(Suspended) 상태인지 확인
            boolean isSuspended = memberRepository.findByEmail(email)
                    .map(member -> member.isSuspended())
                    .orElse(false);

            if (isSuspended) {
                // 정지된 회원이면 403 Forbidden 응답 후 필터 중단
                response.sendError(HttpServletResponse.SC_FORBIDDEN, "정지된 계정입니다.");
                return;
            }

            // 5. 정상이면 SecurityContext에 인증 정보 저장
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader(AUTHORIZATION_HEADER);
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith(BEARER_PREFIX)) {
            return bearerToken.substring(7);
        }
        return null;
    }
}