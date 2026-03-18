package com.dailo.backend.service;

import com.dailo.backend.domain.enums.Role;
import com.dailo.backend.domain.enums.SocialType;
import com.dailo.backend.dto.KakaoUserInfo;
import com.dailo.backend.dto.OAuth2UserInfo;
import com.dailo.backend.entity.Member;
import com.dailo.backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private static final String DEFAULT_SOCIAL_PASSWORD = "oauth2user";

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        if (!"kakao".equalsIgnoreCase(registrationId)) {
            throw new OAuth2AuthenticationException("Unsupported provider: " + registrationId);
        }

        OAuth2UserInfo oAuth2UserInfo = new KakaoUserInfo(oAuth2User.getAttributes());
        String providerId = oAuth2UserInfo.getProviderId();

        Optional<Member> memberOptional =
                memberRepository.findBySocialTypeAndSocialId(SocialType.KAKAO, providerId);

        Member member;
        if (memberOptional.isPresent()) {
            member = memberOptional.get();

            // 닉네임은 앱에서 사용자가 바꾼 값을 유지
            // 카카오 프로필 이미지만 필요 시 갱신
            String kakaoImageUrl = oAuth2UserInfo.getImageUrl();
            if (kakaoImageUrl != null && !kakaoImageUrl.isBlank()) {
                member.updateProfile(null, kakaoImageUrl);
            }

            memberRepository.save(member);
        } else {
            String email = resolveEmail(oAuth2UserInfo.getEmail(), providerId);

            if (memberRepository.existsByEmail(email)) {
                throw new OAuth2AuthenticationException("이미 동일한 이메일로 가입된 계정이 존재합니다. 기존 방식으로 로그인해주세요.");
            }

            member = Member.builder()
                    .email(email)
                    .nickname(
                            oAuth2UserInfo.getNickname() != null && !oAuth2UserInfo.getNickname().isBlank()
                                    ? oAuth2UserInfo.getNickname()
                                    : "카카오유저"
                    )
                    .profileImageExternalUrl(oAuth2UserInfo.getImageUrl())
                    .profileImageKey(null)
                    .role(Role.USER)
                    .socialType(SocialType.KAKAO)
                    .socialId(providerId)
                    .password(passwordEncoder.encode(DEFAULT_SOCIAL_PASSWORD))
                    .build();

            memberRepository.save(member);
        }

        String roleName = (member.getRole() != null) ? member.getRole().name() : "USER";

        return new DefaultOAuth2User(
                List.of(new SimpleGrantedAuthority("ROLE_" + roleName)),
                oAuth2User.getAttributes(),
                "id"
        );
    }

    private String resolveEmail(String kakaoEmail, String providerId) {
        if (kakaoEmail != null && !kakaoEmail.isBlank()) {
            return kakaoEmail;
        }
        return "kakao_" + providerId + "@kakao.local";
    }
}