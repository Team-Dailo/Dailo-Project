package com.dailo.backend.service;

import com.dailo.backend.domain.enums.EmailTokenType;
import com.dailo.backend.entity.EmailToken;
import com.dailo.backend.entity.Member;
import com.dailo.backend.repository.EmailTokenRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;

@Service
@RequiredArgsConstructor
public class EmailTokenService {

    private final EmailTokenRepository emailTokenRepository;

    // 💡 인증번호는 무차별 대입 방지를 위해 5분으로 단축, 비밀번호 재설정은 20분 유지
    private static final Duration VERIFY_EMAIL_TTL = Duration.ofMinutes(5);
    private static final Duration RESET_PASSWORD_TTL = Duration.ofMinutes(20);

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    /**
     * 1. 이메일 인증 토큰 발급 (가입 전이므로 member 대신 email만 받음!)
     */
    @Transactional
    public String issueVerifyEmailToken(String email) {
        return issueToken(null, email, EmailTokenType.VERIFY_EMAIL, VERIFY_EMAIL_TTL);
    }

    /**
     * 2. 비밀번호 재설정 토큰 발급 (기존 회원용이므로 member 객체 활용)
     */
    @Transactional
    public String issueResetPasswordToken(Member member) {
        return issueToken(member, member.getEmail(), EmailTokenType.RESET_PASSWORD, RESET_PASSWORD_TTL);
    }

    /**
     * 3. 토큰 검증 + 사용처리
     */
    @Transactional
    public EmailToken consumeValidToken(String rawToken, EmailTokenType type) {
        String tokenHash = hashToken(rawToken);
        LocalDateTime now = LocalDateTime.now();

        EmailToken token = emailTokenRepository
                .findByTokenHashAndTypeAndUsedAtIsNullAndExpiresAtAfter(tokenHash, type, now)
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않거나 이미 만료된 토큰입니다."));

        token.useToken();
        return token;
    }

    /**
     * 내부: 토큰 생성 & 저장
     */
    private String issueToken(Member member, String email, EmailTokenType type, Duration ttl) {
        // 기존 미사용 토큰 무효화
        emailTokenRepository
                .findTopByEmailAndTypeAndUsedAtIsNullOrderByCreatedAtDesc(email, type)
                .ifPresent(old -> old.useToken());

        // 💡 용도에 따라 인증번호 형태 분리! (가입은 6자리 숫자, 비번찾기는 64자리 난수)
        String rawToken = type == EmailTokenType.VERIFY_EMAIL ? generate6DigitCode() : generateHexToken();
        String tokenHash = hashToken(rawToken);

        EmailToken token = EmailToken.builder()
                .tokenHash(tokenHash)
                .type(type)
                .member(member)
                .email(email)
                .expiresAt(LocalDateTime.now().plus(ttl))
                .build();

        emailTokenRepository.save(token);
        return rawToken;
    }

    /**
     * 사용자 입력용 6자리 숫자 생성
     */
    private String generate6DigitCode() {
        return String.valueOf(100000 + SECURE_RANDOM.nextInt(900000));
    }

    /**
     * 링크 클릭용 64자리 Hex 문자열 생성
     */
    private String generateHexToken() {
        byte[] bytes = new byte[32]; // 256-bit
        SECURE_RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    /**
     * SHA-256 해시
     */
    public String hashToken(String rawToken) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("토큰 해싱에 실패했습니다.", e);
        }
    }
}