package com.dailo.backend.jwt;

import com.dailo.backend.entity.Member;
import com.dailo.backend.repository.MemberRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final MemberRepository memberRepository;
    private final TokenProvider tokenProvider;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException, ServletException {

        log.info("✅ OAuth2SuccessHandler TRIGGERED");

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        // Kakao는 user-name-attribute=id로 설정되어 있으니 attributes에서 id를 꺼낼 수 있음
        Object kakaoIdObj = oAuth2User.getAttributes().get("id");
        String kakaoId = kakaoIdObj != null ? String.valueOf(kakaoIdObj) : null;

        if (kakaoId == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("Missing kakao id");
            return;
        }

        Member member = memberRepository.findBySocialTypeAndSocialId(
                com.dailo.backend.domain.enums.SocialType.KAKAO, kakaoId
        ).orElseThrow(() -> new IllegalStateException("Member not found for kakaoId=" + kakaoId));;

        TokenDto tokenDto = tokenProvider.generateTokenDtoForMember(
                String.valueOf(member.getId()),
                member.getRole().name()
        );

        // 모바일 앱 딥링크로 리다이렉트 (Expo app.json의 scheme = "app")
        String accessToken = URLEncoder.encode(tokenDto.getAccessToken(), StandardCharsets.UTF_8);
        String refreshToken = URLEncoder.encode(tokenDto.getRefreshToken(), StandardCharsets.UTF_8);
        long expiresIn = tokenDto.getAccessTokenExpiresIn();

        String redirectUrl = String.format(
                "app://kakao-login?accessToken=%s&refreshToken=%s&accessTokenExpiresIn=%d",
                accessToken,
                refreshToken,
                expiresIn
        );

        log.info("✅ Kakao OAuth2 success, redirecting to {}", redirectUrl);
        response.sendRedirect(redirectUrl);
    }
}