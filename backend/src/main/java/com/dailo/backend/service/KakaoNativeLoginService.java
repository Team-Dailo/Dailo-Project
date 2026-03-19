package com.dailo.backend.service;

import com.dailo.backend.domain.enums.Role;
import com.dailo.backend.domain.enums.SocialType;
import com.dailo.backend.dto.KakaoUserInfo;
import com.dailo.backend.dto.OAuth2UserInfo;
import com.dailo.backend.dto.auth.KakaoNativeLoginRequestDto;
import com.dailo.backend.entity.Member;
import com.dailo.backend.entity.RefreshToken;
import com.dailo.backend.jwt.TokenDto;
import com.dailo.backend.jwt.TokenProvider;
import com.dailo.backend.repository.MemberRepository;
import com.dailo.backend.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class KakaoNativeLoginService {

    private static final String KAKAO_USER_ME_URL = "https://kapi.kakao.com/v2/user/me";
    private static final String DEFAULT_SOCIAL_PASSWORD = "oauth2user";

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenProvider tokenProvider;
    private final RestTemplate restTemplate;
    private final RefreshTokenRepository refreshTokenRepository;

    @Transactional
    public TokenDto loginWithKakaoToken(KakaoNativeLoginRequestDto request) {
        String accessToken = validateAccessToken(request);
        OAuth2UserInfo userInfo = getKakaoUserInfo(accessToken);
        Member member = findOrCreateKakaoMember(userInfo);
        Member savedMember = memberRepository.save(member);

        log.info("카카오 로그인 성공 - Member ID: {}", savedMember.getId());

        TokenDto tokenDto = tokenProvider.generateTokenDtoForMember(
                savedMember.getEmail(),
                savedMember.getRole() != null ? savedMember.getRole().name() : Role.USER.name()
        );

        // 카카오 네이티브 로그인도 Refresh Token DB 저장
        RefreshToken refreshToken = RefreshToken.builder()
                .keyId(savedMember.getEmail())
                .value(tokenDto.getRefreshToken())
                .build();
        refreshTokenRepository.save(refreshToken);

        return tokenDto;
    }

    private String validateAccessToken(KakaoNativeLoginRequestDto request) {
        if (request == null || request.getAccessToken() == null || request.getAccessToken().isBlank()) {
            throw new IllegalArgumentException("카카오 액세스 토큰이 없습니다.");
        }
        return request.getAccessToken();
    }

    private OAuth2UserInfo getKakaoUserInfo(String accessToken) {
        Map<String, Object> kakaoAttributes = fetchKakaoUserMe(accessToken);
        OAuth2UserInfo userInfo = new KakaoUserInfo(kakaoAttributes);

        String providerId = userInfo.getProviderId();
        if (providerId == null || providerId.isBlank()) {
            throw new IllegalArgumentException("카카오 사용자 식별값을 가져올 수 없습니다.");
        }

        log.debug("카카오 로그인 시도 - providerId: {}", providerId);
        return userInfo;
    }

    private Member findOrCreateKakaoMember(OAuth2UserInfo userInfo) {
        String providerId = userInfo.getProviderId();

        Optional<Member> memberOptional =
                memberRepository.findBySocialTypeAndSocialId(SocialType.KAKAO, providerId);

        if (memberOptional.isPresent()) {
            Member existingMember = memberOptional.get();
            existingMember.updateProfile(
                    userInfo.getNickname() != null ? userInfo.getNickname() : existingMember.getNickname(),
                    userInfo.getImageUrl()
            );
            log.info("기존 카카오 회원 로그인 처리 - Member ID: {}", existingMember.getId());
            return existingMember;
        }

        log.info("신규 카카오 회원 가입 진행");

        String email = resolveEmail(userInfo.getEmail(), providerId);

        if (memberRepository.existsByEmail(email)) {
            log.warn("이메일 중복으로 카카오 회원가입 실패 - email: {}", email);
            throw new IllegalStateException("이미 동일한 이메일로 가입된 계정이 존재합니다. 기존 방식으로 로그인해주세요.");
        }

        return Member.builder()
                .email(email)
                .nickname(
                        userInfo.getNickname() != null && !userInfo.getNickname().isBlank()
                                ? userInfo.getNickname()
                                : "카카오유저"
                )
                .profileImageExternalUrl(userInfo.getImageUrl())
                .profileImageKey(null)
                .role(Role.USER)
                .socialType(SocialType.KAKAO)
                .socialId(providerId)
                .password(passwordEncoder.encode(DEFAULT_SOCIAL_PASSWORD))
                .build();
    }

    private String resolveEmail(String kakaoEmail, String providerId) {
        if (kakaoEmail != null && !kakaoEmail.isBlank()) {
            return kakaoEmail;
        }
        return "kakao_" + providerId + "@kakao.local";
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchKakaoUserMe(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        headers.setAccept(MediaType.parseMediaTypes(MediaType.APPLICATION_JSON_VALUE));

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

            log.error("Kakao /v2/user/me 응답 이상 - status: {}", response.getStatusCode());
            throw new IllegalStateException("카카오 사용자 정보 조회에 실패했습니다.");
        } catch (HttpClientErrorException.Unauthorized | HttpClientErrorException.Forbidden e) {
            log.warn("유효하지 않은 카카오 토큰 - status: {}", e.getStatusCode());
            throw new IllegalArgumentException("카카오 토큰이 유효하지 않거나 만료되었습니다.");
        } catch (RestClientException e) {
            log.error("Kakao /v2/user/me API 호출 중 통신 오류", e);
            throw new IllegalStateException("카카오 서버와 통신 중 오류가 발생했습니다.");
        }
    }
}