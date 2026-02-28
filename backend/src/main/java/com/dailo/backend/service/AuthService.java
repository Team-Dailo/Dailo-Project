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

        if (memberRepository.existsByEmail(email)) {
            throw new ConflictException("이미 가입된 이메일입니다.");
        }

        String rawToken = emailTokenService.issueVerifyEmailToken(email);        // 메일 발송
        mailService.sendVerifyEmail(email, rawToken);
    }


    /* ===========================
        2. 회원가입
     =========================== */
    @Transactional
    public MemberResponseDto signup(MemberRequestDto requestDto) {

        String email = requestDto.getEmail();

        // 중복 가입 방어
        if (memberRepository.existsByEmail(email)) {
            throw new ConflictException("이미 가입된 이메일입니다.");
        }

        // 💡 프론트에서 넘어온 인증번호(authCode)를 검증하고 사용 처리
        EmailToken token = emailTokenService.consumeValidToken(
                requestDto.getAuthCode(),
                EmailTokenType.VERIFY_EMAIL
        );

        // 보안 검증
        if (!token.getEmail().equals(email)) {
            throw new IllegalArgumentException("인증된 이메일과 가입 요청 이메일이 일치하지 않습니다.");
        }

        // 검증 통과 시 대기 상태(PENDING) 없이 즉시 정상 회원으로 변환 및 저장
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

            // 로그인 성공 시 Refresh Token을 DB에 저장
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

        // 보안상 동일 응답
        if (member == null || member.getStatus() == MemberStatus.DELETED) {
            return;
        }

        if (member.getSocialType() != SocialType.LOCAL) {
            return;
        }

        // 기존 회원이므로 member 객체와 email을 함께 넘겨서 발급
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
        // Refresh Token이 유효한지 검증
        if (!tokenProvider.validateToken(tokenRequestDto.getRefreshToken())) {
            throw new RuntimeException("Refresh Token이 유효하지 않습니다.");
        }

        // 만료된 Access Token에서 유저 정보(Authentication) 가져오기
        Authentication authentication = tokenProvider.getAuthentication(tokenRequestDto.getAccessToken());

        // DB에서 유저 ID(이름)를 기반으로 저장된 Refresh Token 값 가져오기
        RefreshToken refreshToken = refreshTokenRepository.findById(authentication.getName())
                .orElseThrow(() -> new RuntimeException("로그아웃 된 사용자입니다."));

        // DB에 저장된 토큰과 프론트에서 보낸 토큰이 일치하는지 검사
        if (!refreshToken.getValue().equals(tokenRequestDto.getRefreshToken())) {
            throw new RuntimeException("토큰의 유저 정보가 일치하지 않습니다.");
        }

        // 모든 검증을 통과했으므로 새로운 Access Token & Refresh Token 생성
        TokenDto tokenDto = tokenProvider.generateTokenDto(authentication);

        // DB의 Refresh Token 정보 업데이트
        RefreshToken newRefreshToken = refreshToken.updateValue(tokenDto.getRefreshToken());
        refreshTokenRepository.save(newRefreshToken);

        return tokenDto;
    }

    /* ===========================
        7. 로그아웃
     =========================== */
    @Transactional
    public void logout(String email) {
        // DB에 해당 이메일(ID)로 저장된 Refresh Token이 있다면 삭제
        refreshTokenRepository.deleteById(email);
    }
}