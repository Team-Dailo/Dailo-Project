package com.dailo.backend.service;

import com.dailo.backend.dto.auth.LoginRequestDto;
import com.dailo.backend.dto.auth.LoginResponseDto;
import com.dailo.backend.dto.auth.MemberRequestDto;
import com.dailo.backend.dto.auth.MemberResponseDto;
import com.dailo.backend.jwt.TokenDto;
import com.dailo.backend.jwt.TokenProvider;
import com.dailo.backend.entity.Member;
import com.dailo.backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
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
    private final LoginVerifyService loginVerifyService;

    /**
     * 회원가입
     */
    @Transactional
    public MemberResponseDto signup(MemberRequestDto requestDto) {
        if (memberRepository.existsByEmail(requestDto.getEmail())) {
            throw new RuntimeException("이미 가입되어 있는 유저입니다");
        }

        Member member = requestDto.toMember(passwordEncoder);
        return MemberResponseDto.of(memberRepository.save(member));
    }

    /**
     * 로그인. 관리자 이메일(yunajo5858@gmail.com)인 경우 이메일 확인 후 로그인 완료.
     */
    @Transactional
    public LoginResponseDto login(LoginRequestDto requestDto) {
        UsernamePasswordAuthenticationToken authenticationToken = requestDto.toAuthentication();
        Authentication authentication = authenticationManagerBuilder.getObject().authenticate(authenticationToken);

        String email = requestDto.getEmail();
        if (loginVerifyService.requiresEmailVerification(email)) {
            loginVerifyService.createPendingAndSendEmail(email);
            return LoginResponseDto.emailVerificationRequired("로그인 확인 이메일을 발송했습니다. Gmail에서 확인 링크를 눌러 주세요.");
        }

        TokenDto tokenDto = tokenProvider.generateTokenDto(authentication);
        return LoginResponseDto.withToken(tokenDto);
    }
}