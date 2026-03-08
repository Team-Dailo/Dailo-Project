package com.dailo.backend.service;

import com.dailo.backend.entity.Member;
import com.dailo.backend.jwt.TokenDto;
import com.dailo.backend.jwt.TokenProvider;
import com.dailo.backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 관리자 이메일(yunajo5858@gmail.com) 로그인 시 이메일 확인 링크 발송 및 토큰 교환.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LoginVerifyService {

    private static final long PENDING_TTL_SECONDS = 600; // 10분
    private static final long TOKEN_DTO_TTL_SECONDS = 120; // 2분

    private final MemberRepository memberRepository;
    private final TokenProvider tokenProvider;
    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${app.login-verify.admin-email:yunajo5858@gmail.com}")
    private String adminEmailForVerify;

    @Value("${app.login-verify.base-url:https://dailoapp.com}")
    private String baseUrl;

    private final Map<String, PendingLogin> pending = new ConcurrentHashMap<>();
    private final Map<String, CachedTokenDto> tokenDtoCache = new ConcurrentHashMap<>();

    public boolean requiresEmailVerification(String email) {
        return email != null && email.trim().equalsIgnoreCase(adminEmailForVerify.trim());
    }

    /** 로그인 직후 호출: 비밀번호는 이미 검증됨. 토큰 생성 후 이메일 발송. */
    public String createPendingAndSendEmail(String email) {
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("회원 정보가 없습니다."));
        String token = UUID.randomUUID().toString().replace("-", "");
        pending.put(token, new PendingLogin(member.getId(), email, Instant.now().plusSeconds(PENDING_TTL_SECONDS)));

        if (mailSender == null) {
            pending.remove(token);
            throw new RuntimeException("이메일 발송이 설정되지 않았습니다. application.properties에 spring.mail 설정을 추가해 주세요.");
        }
        String confirmUrl = baseUrl + "/api/auth/confirm-login?token=" + token;
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(email);
            msg.setSubject("[다일로] 로그인 확인");
            msg.setText("로그인 확인을 위해 아래 링크를 눌러 주세요.\n\n" + confirmUrl + "\n\n이 링크는 10분간 유효합니다.");
            mailSender.send(msg);
            log.info("Login verify email sent to {}", email);
        } catch (Exception e) {
            log.warn("Failed to send login verify email to {}: {}", email, e.getMessage());
            pending.remove(token);
            throw new RuntimeException("이메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        }
        return token;
    }

    /** 확인 링크 클릭 시: 토큰 검증 후 JWT 생성해 캐시에 넣고 반환. (HTML 리다이렉트용) */
    public TokenDto confirmAndCacheTokenDto(String token) {
        PendingLogin pl = pending.remove(token);
        if (pl == null || pl.expiresAt.isBefore(Instant.now())) {
            throw new RuntimeException("만료되었거나 잘못된 링크입니다.");
        }
        Member member = memberRepository.findById(pl.memberId)
                .orElseThrow(() -> new RuntimeException("회원 정보가 없습니다."));
        TokenDto dto = tokenProvider.generateTokenDtoForMember(
                String.valueOf(member.getId()),
                member.getRole() != null ? member.getRole().name() : "USER");
        tokenDtoCache.put(token, new CachedTokenDto(dto, Instant.now().plusSeconds(TOKEN_DTO_TTL_SECONDS)));
        return dto;
    }

    /** 앱에서 딥링크로 열렸을 때: 캐시된 JWT 반환 후 삭제 */
    public TokenDto exchangeTokenAndRemove(String token) {
        CachedTokenDto cached = tokenDtoCache.remove(token);
        if (cached == null || cached.expiresAt.isBefore(Instant.now())) {
            throw new RuntimeException("만료되었거나 이미 사용된 링크입니다.");
        }
        return cached.tokenDto;
    }

    private record PendingLogin(long memberId, String email, Instant expiresAt) {}
    private record CachedTokenDto(TokenDto tokenDto, Instant expiresAt) {}
}
