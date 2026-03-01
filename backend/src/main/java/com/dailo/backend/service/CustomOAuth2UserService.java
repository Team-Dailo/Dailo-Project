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

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder; // ✅ 추가

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        // 1) 어떤 소셜 로그인인지 (kakao)
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        if (!"kakao".equalsIgnoreCase(registrationId)) {
            throw new OAuth2AuthenticationException("Unsupported provider: " + registrationId);
        }

        // 2) 카카오 데이터를 규격화
        OAuth2UserInfo oAuth2UserInfo = new KakaoUserInfo(oAuth2User.getAttributes());
        String providerId = oAuth2UserInfo.getProviderId();

        // 3) 기존 회원인지 확인 (socialType + socialId)
        Optional<Member> memberOptional =
                memberRepository.findBySocialTypeAndSocialId(SocialType.KAKAO, providerId);

        Member member;
        if (memberOptional.isPresent()) {
            member = memberOptional.get();

            // 닉네임/프로필 변경 반영
            member.updateProfile(oAuth2UserInfo.getNickname(), oAuth2UserInfo.getImageUrl());

            // 변경 저장(영속 상태면 생략 가능하지만 명시해도 무방)
            memberRepository.save(member);
        } else {
            // 이메일 미제공 대비: kakao_{id} 형태로 저장
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

                    // ✅ 더미 BCrypt 비밀번호 (폼로그인/기타 인증과 섞일 때 null/평문 문제 방지)
                    .password(passwordEncoder.encode("oauth2user"))
                    .build();

            memberRepository.save(member);
        }

        // 4) SecurityContext에 저장될 OAuth2User 반환
        // role에 맞춰 ROLE_USER / ROLE_ADMIN 등 부여
        String roleName = (member.getRole() != null) ? member.getRole().name() : "USER";

        return new DefaultOAuth2User(
                List.of(new SimpleGrantedAuthority("ROLE_" + roleName)),
                oAuth2User.getAttributes(),
                "id" // Kakao user-name-attribute = id
        );
    }
}