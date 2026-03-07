package com.dailo.backend.service;

import com.dailo.backend.domain.enums.Role;
import com.dailo.backend.domain.enums.SocialType;
import com.dailo.backend.dto.KakaoUserInfo;
import com.dailo.backend.dto.OAuth2UserInfo;
import com.dailo.backend.dto.auth.KakaoNativeLoginRequestDto;
import com.dailo.backend.entity.Member;
import com.dailo.backend.jwt.TokenDto;
import com.dailo.backend.jwt.TokenProvider;
import com.dailo.backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.Optional;

/**
 * 앱 내 카카오톡(네이티브) 로그인: 카카오 액세스 토큰으로 사용자 정보 조회 후 회원 찾기/생성 및 JWT 발급
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KakaoNativeLoginService {

    private static final String KAKAO_USER_ME_URL = "https://kapi.kakao.com/v2/user/me";

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenProvider tokenProvider;
    private final RestTemplate restTemplate = new RestTemplate();

    @Transactional
    public TokenDto loginWithKakaoToken(KakaoNativeLoginRequestDto request) {
        String accessToken = request.getAccessToken();
        if (accessToken == null || accessToken.isBlank()) {
            throw new IllegalArgumentException("카카오 액세스 토큰이 없습니다.");
        }

        Map<String, Object> kakaoAttributes = fetchKakaoUserMe(accessToken);
        OAuth2UserInfo oAuth2UserInfo = new KakaoUserInfo(kakaoAttributes);
        String providerId = oAuth2UserInfo.getProviderId();

        Optional<Member> memberOptional =
                memberRepository.findBySocialTypeAndSocialId(SocialType.KAKAO, providerId);

        Member member;
        if (memberOptional.isPresent()) {
            member = memberOptional.get();
            member.updateProfile(oAuth2UserInfo.getNickname(), oAuth2UserInfo.getImageUrl());
            memberRepository.save(member);
        } else {
            String email = (oAuth2UserInfo.getEmail() != null && !oAuth2UserInfo.getEmail().isBlank())
                    ? oAuth2UserInfo.getEmail()
                    : "kakao_" + providerId;

            member = Member.builder()
                    .email(email)
                    .nickname(oAuth2UserInfo.getNickname() != null ? oAuth2UserInfo.getNickname() : "카카오유저")
                    .profileImageUrl(oAuth2UserInfo.getImageUrl())
                    .role(Role.USER)
                    .socialType(SocialType.KAKAO)
                    .socialId(providerId)
                    .password(passwordEncoder.encode("oauth2user"))
                    .build();
            memberRepository.save(member);
        }

        return tokenProvider.generateTokenDtoForMember(
                String.valueOf(member.getId()),
                member.getRole() != null ? member.getRole().name() : "USER"
        );
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchKakaoUserMe(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    KAKAO_USER_ME_URL,
                    HttpMethod.GET,
                    entity,
                    Map.class
            );
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return (Map<String, Object>) response.getBody();
            }
        } catch (RestClientException e) {
            log.warn("Kakao /v2/user/me failed: {}", e.getMessage());
        }
        throw new IllegalArgumentException("카카오 토큰이 유효하지 않거나 만료되었습니다.");
    }
}
