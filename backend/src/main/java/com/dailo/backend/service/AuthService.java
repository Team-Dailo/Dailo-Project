package com.dailo.backend.service;

import com.dailo.backend.domain.enums.EmailTokenType;
import com.dailo.backend.domain.enums.MemberStatus;
import com.dailo.backend.domain.enums.SocialType;
import com.dailo.backend.dto.auth.LoginRequestDto;
import com.dailo.backend.dto.auth.MemberRequestDto;
import com.dailo.backend.dto.auth.MemberResponseDto;
import com.dailo.backend.dto.auth.TokenRequestDto;
import com.dailo.backend.entity.RefreshToken;
import com.dailo.backend.exception.ConflictException;
import com.dailo.backend.exception.ForbiddenException;
import com.dailo.backend.jwt.TokenDto;
import com.dailo.backend.jwt.TokenProvider;
import com.dailo.backend.entity.EmailToken;
import com.dailo.backend.entity.Member;
import com.dailo.backend.repository.MemberRepository;
import com.dailo.backend.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

    private final AuthenticationManagerBuilder authenticationManagerBuilder;
    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenProvider tokenProvider;

    private final EmailTokenService emailTokenService;
    private final MailService mailService;

    private final RefreshTokenRepository refreshTokenRepository;

    /* ===========================
        1. 회원가입 이메일 인증번호 발송 (가입 전)
     =========================== */
    @Transactional
    public void sendSignUpEmail(String email) {

        if (memberRepository.existsByEmailAndStatusNot(email, MemberStatus.DELETED)) {
            throw new ConflictException("이미 가입된 이메일입니다.");
        }

        String rawToken = emailTokenService.issueVerifyEmailToken(email);
        mailService.sendVerifyEmail(email, rawToken);
    }


    /* ===========================
        2. 회원가입
     =========================== */
    @Transactional
    public MemberResponseDto signup(MemberRequestDto requestDto) {

        String email = requestDto.getEmail();

        if (memberRepository.existsByEmailAndStatusNot(email, MemberStatus.DELETED)) {
            throw new ConflictException("이미 가입된 이메일입니다.");
        }

        EmailToken token = emailTokenService.consumeValidToken(
                requestDto.getAuthCode(),
                EmailTokenType.VERIFY_EMAIL
        );

        if (!token.getEmail().equals(email)) {
            throw new IllegalArgumentException("인증된 이메일과 가입 요청 이메일이 일치하지 않습니다.");
        }

        Member existing = memberRepository.findByEmail(email).orElse(null);
        if (existing != null) {
            // 탈퇴한 계정 재활성화
            existing.reactivate(passwordEncoder.encode(requestDto.getPassword()), requestDto.getNickname().trim());
            return MemberResponseDto.of(existing, null);
        }

        Member member = requestDto.toMember(passwordEncoder);
        Member saved = memberRepository.save(member);

        return MemberResponseDto.of(saved, null);
    }


    /* ===========================
        3. 로그인
     =========================== */
    @Transactional
    public TokenDto login(LoginRequestDto requestDto) {

        String email = requestDto.getEmail();
        Member member = memberRepository.findByEmail(email).orElse(null);

        if (member == null || member.getStatus() == MemberStatus.DELETED) {
            throw new BadCredentialsException("존재하지 않는 계정");
        }

        if (member.isSuspended()) {
            throw new ForbiddenException("정지 계정");
        }

        UsernamePasswordAuthenticationToken token = requestDto.toAuthentication();

        try {
            Authentication auth = authenticationManagerBuilder.getObject().authenticate(token);
            TokenDto tokenDto = tokenProvider.generateTokenDto(auth);

            RefreshToken refreshToken = RefreshToken.builder()
                    .keyId(auth.getName())
                    .value(tokenDto.getRefreshToken())
                    .build();
            refreshTokenRepository.save(refreshToken);

            return tokenDto;
        } catch (Exception e) {
            throw new BadCredentialsException("비밀번호 오류");
        }
    }



    /* ===========================
        4. 비밀번호 재설정 요청
     =========================== */
    @Transactional
    public void requestPasswordReset(String email) {

        Member member = memberRepository.findByEmail(email).orElse(null);

        if (member == null || member.getStatus() == MemberStatus.DELETED) {
            return;
        }

        if (member.getSocialType() != SocialType.LOCAL) {
            return;
        }

        String rawToken = emailTokenService.issueResetPasswordToken(member);
        mailService.sendResetPasswordEmail(email, rawToken);
    }


    /* ===========================
        5. 비밀번호 재설정 확정
     =========================== */
    @Transactional
    public void confirmPasswordReset(String rawToken, String newPassword) {

        EmailToken token = emailTokenService.consumeValidToken(
                rawToken,
                EmailTokenType.RESET_PASSWORD
        );

        Member member = token.getMember();

        if (member == null) {
            throw new IllegalStateException("회원 없음");
        }

        if (member.getStatus() == MemberStatus.DELETED) {
            throw new IllegalArgumentException("유효하지 않은 토큰");
        }

        member.changePassword(passwordEncoder.encode(newPassword));
    }

    /* ===========================
        6. 토큰 재발급
     =========================== */
    @Transactional
    public TokenDto reissue(TokenRequestDto tokenRequestDto) {
        // refresh token만으로 재발급 가능하게 변경
        String requestRefreshToken = tokenRequestDto.getRefreshToken();

        if (!tokenProvider.validateToken(requestRefreshToken)) {
            throw new BadCredentialsException("Refresh Token이 유효하지 않습니다.");
        }

        //  refresh token의 subject(email) 추출
        String email = tokenProvider.getSubject(requestRefreshToken);

        //  DB에 저장된 refresh token 조회
        RefreshToken savedRefreshToken = refreshTokenRepository.findById(email)
                .orElseThrow(() -> new BadCredentialsException("로그아웃 된 사용자입니다."));


        // DB 값과 요청값 비교
        if (!savedRefreshToken.getValue().equals(requestRefreshToken)) {
            throw new BadCredentialsException("Refresh Token이 일치하지 않습니다.");
        }

        // 사용자 최신 권한/상태 기준으로 새 토큰 발급
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        TokenDto tokenDto = tokenProvider.generateTokenDtoForMember(
                member.getEmail(),
                member.getRole().name()
        );

        // refresh token rotation
        RefreshToken newRefreshToken = savedRefreshToken.updateValue(tokenDto.getRefreshToken());
        refreshTokenRepository.save(newRefreshToken);

        return tokenDto;
    }

    /* ===========================
        7. 로그아웃
     =========================== */
    @Transactional
    public void logout(String email) {
        refreshTokenRepository.deleteById(email);
    }
}