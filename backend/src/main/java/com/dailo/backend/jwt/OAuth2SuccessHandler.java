package com.dailo.backend.jwt;

import com.dailo.backend.domain.enums.SocialType;
import com.dailo.backend.entity.Member;
import com.dailo.backend.entity.RefreshToken;
import com.dailo.backend.repository.MemberRepository;
import com.dailo.backend.repository.RefreshTokenRepository;
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
    private final RefreshTokenRepository refreshTokenRepository; // ㄱ 수정

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException, ServletException {

        log.info("✅ OAuth2SuccessHandler TRIGGERED");

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        Object kakaoIdObj = oAuth2User.getAttributes().get("id");
        String kakaoId = kakaoIdObj != null ? String.valueOf(kakaoIdObj) : null;

        if (kakaoId == null) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("Missing kakao id");
            return;
        }

        Member member = memberRepository.findBySocialTypeAndSocialId(SocialType.KAKAO, kakaoId)
                .orElseThrow(() -> new IllegalStateException("Member not found for kakaoId=" + kakaoId));

        TokenDto tokenDto = tokenProvider.generateTokenDtoForMember(
                member.getEmail(),
                member.getRole().name()
        );

        RefreshToken refreshToken = RefreshToken.builder()
                .keyId(member.getEmail())
                .value(tokenDto.getRefreshToken())
                .build();
        refreshTokenRepository.save(refreshToken);

        String accessToken = URLEncoder.encode(tokenDto.getAccessToken(), StandardCharsets.UTF_8);
        String refreshTokenValue = URLEncoder.encode(tokenDto.getRefreshToken(), StandardCharsets.UTF_8);
        long expiresIn = tokenDto.getAccessTokenExpiresIn();

        String redirectUrl = String.format(
                "app://kakao-login?accessToken=%s&refreshToken=%s&accessTokenExpiresIn=%d",
                accessToken,
                refreshTokenValue,
                expiresIn
        );

        log.info("✅ Kakao OAuth2 success, redirecting to {}", redirectUrl);
        response.sendRedirect(redirectUrl);
    }
}