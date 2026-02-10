package com.dailo.backend.service;

import com.dailo.backend.domain.enums.Role;
import com.dailo.backend.dto.auth.LoginRequestDto;
import com.dailo.backend.dto.auth.LoginResponseDto;
import com.dailo.backend.dto.auth.MemberRequestDto;
import com.dailo.backend.dto.auth.MemberResponseDto;
import com.dailo.backend.jwt.TokenDto;
import com.dailo.backend.jwt.TokenProvider;
import com.dailo.backend.entity.Member;
import com.dailo.backend.exception.ConflictException;
import com.dailo.backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final AuthenticationManagerBuilder authenticationManagerBuilder;
    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenProvider tokenProvider;

    @Value("${app.admin.emails:}")
    private String adminEmailsProperty;

    /**
     * 회원가입
     */
    @Transactional
    public MemberResponseDto signup(MemberRequestDto requestDto) {
        if (memberRepository.existsByEmail(requestDto.getEmail())) {
            throw new ConflictException("이미 가입되어 있는 이메일입니다.");
        }

        Member member = requestDto.toMember(passwordEncoder);
        return MemberResponseDto.of(memberRepository.save(member));
    }

    /**
     * 로그인 - 토큰 + 닉네임 반환 (마이페이지 표시용)
     */
    @Transactional
    public LoginResponseDto login(LoginRequestDto requestDto) {
        UsernamePasswordAuthenticationToken authenticationToken = requestDto.toAuthentication();
        Authentication authentication = authenticationManagerBuilder.getObject().authenticate(authenticationToken);

        TokenDto tokenDto = tokenProvider.generateTokenDto(authentication);
        String email = authentication.getName();
        Member member = memberRepository.findByEmail(email).orElse(null);
        String nickname = member != null ? (member.getNickname() != null ? member.getNickname() : "") : "";
        Long userId = member != null ? member.getId() : null;
        return LoginResponseDto.of(tokenDto, nickname, userId);
    }

    /**
     * 현재 사용자 정보 (이메일·닉네임·역할) - JWT에서 이메일로 조회.
     * app.admin.emails에 포함된 이메일이면 DB에 ADMIN 반영 후 응답(서버 재시작 없이도 관리자 메뉴 노출).
     */
    @Transactional
    public MemberResponseDto getMe(String email) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("회원 정보를 찾을 수 없습니다."));
        if (isAdminEmail(email) && member.getRole() != Role.ADMIN) {
            member.setRole(Role.ADMIN);
            memberRepository.save(member);
        }
        return MemberResponseDto.of(member);
    }

    private boolean isAdminEmail(String email) {
        if (adminEmailsProperty == null || adminEmailsProperty.isBlank()) return false;
        List<String> emails = Arrays.stream(adminEmailsProperty.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
        return email != null && emails.contains(email.trim());
    }

    /**
     * 이메일로 회원 ID 조회 (JWT에서 작성자 결정할 때 사용)
     */
    @Transactional(readOnly = true)
    public Optional<Long> getMemberIdByEmail(String email) {
        return memberRepository.findByEmail(email).map(Member::getId);
    }

    /**
     * 닉네임 변경
     */
    @Transactional
    public MemberResponseDto updateNickname(String email, String newNickname) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("회원 정보를 찾을 수 없습니다."));
        member.updateNickname(newNickname);
        return MemberResponseDto.of(memberRepository.save(member));
    }
}