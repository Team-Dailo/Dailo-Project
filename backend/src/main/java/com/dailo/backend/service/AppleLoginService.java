package com.dailo.backend.service;

import com.dailo.backend.domain.enums.Role;
import com.dailo.backend.domain.enums.SocialType;
import com.dailo.backend.dto.auth.AppleLoginRequestDto;
import com.dailo.backend.entity.Member;
import com.dailo.backend.entity.RefreshToken;
import com.dailo.backend.jwt.TokenDto;
import com.dailo.backend.jwt.TokenProvider;
import com.dailo.backend.repository.MemberRepository;
import com.dailo.backend.repository.RefreshTokenRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.math.BigInteger;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.RSAPublicKeySpec;
import java.util.Base64;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AppleLoginService {

    private static final String APPLE_PUBLIC_KEYS_URL = "https://appleid.apple.com/auth/keys";
    private static final String APPLE_ISSUER = "https://appleid.apple.com";
    private static final String DEFAULT_SOCIAL_PASSWORD = "oauth2user";

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenProvider tokenProvider;
    private final RestTemplate restTemplate;
    private final RefreshTokenRepository refreshTokenRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public TokenDto loginWithApple(AppleLoginRequestDto request) {
        // 1. identityToken 검증
        Claims claims = verifyIdentityToken(request.getIdentityToken());

        // 2. Apple 사용자 ID (sub claim)
        String appleUserId = claims.getSubject();
        if (appleUserId == null || appleUserId.isBlank()) {
            throw new IllegalArgumentException("Apple 사용자 ID를 가져올 수 없습니다.");
        }

        // 3. 이메일 추출 (JWT claims 또는 request에서)
        String email = claims.get("email", String.class);
        if ((email == null || email.isBlank()) && request.getEmail() != null) {
            email = request.getEmail();
        }

        // 4. 회원 조회 또는 생성
        Member member = findOrCreateAppleMember(appleUserId, email, request.getFullName());
        Member savedMember = memberRepository.save(member);

        log.info("Apple 로그인 성공 - Member ID: {}", savedMember.getId());

        // 5. JWT 토큰 발급
        TokenDto tokenDto = tokenProvider.generateTokenDtoForMember(
                savedMember.getEmail(),
                savedMember.getRole() != null ? savedMember.getRole().name() : Role.USER.name()
        );

        // 6. Refresh Token 저장
        RefreshToken refreshToken = RefreshToken.builder()
                .keyId(savedMember.getEmail())
                .value(tokenDto.getRefreshToken())
                .build();
        refreshTokenRepository.save(refreshToken);

        return tokenDto;
    }

    /**
     * Apple identityToken (JWT) 검증
     * Apple 공개키를 가져와서 서명 검증
     */
    private Claims verifyIdentityToken(String identityToken) {
        if (identityToken == null || identityToken.isBlank()) {
            throw new IllegalArgumentException("Apple identityToken이 없습니다.");
        }

        try {
            // JWT 헤더에서 kid 추출
            String[] parts = identityToken.split("\\.");
            if (parts.length != 3) {
                throw new IllegalArgumentException("잘못된 JWT 형식입니다.");
            }

            String headerJson = new String(Base64.getUrlDecoder().decode(parts[0]));
            JsonNode header = objectMapper.readTree(headerJson);
            String kid = header.get("kid").asText();
            String alg = header.get("alg").asText();

            // Apple 공개키 가져오기
            PublicKey publicKey = getApplePublicKey(kid, alg);

            // JWT 검증 및 Claims 추출
            return Jwts.parserBuilder()
                    .setSigningKey(publicKey)
                    .requireIssuer(APPLE_ISSUER)
                    .build()
                    .parseClaimsJws(identityToken)
                    .getBody();

        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            log.warn("Apple identityToken 만료됨");
            throw new IllegalArgumentException("Apple 로그인 토큰이 만료되었습니다. 다시 로그인해주세요.");
        } catch (io.jsonwebtoken.JwtException e) {
            log.warn("Apple identityToken 검증 실패: {}", e.getMessage());
            throw new IllegalArgumentException("Apple 로그인 토큰이 유효하지 않습니다.");
        } catch (Exception e) {
            log.error("Apple identityToken 검증 중 오류", e);
            throw new IllegalStateException("Apple 로그인 처리 중 오류가 발생했습니다.");
        }
    }

    /**
     * Apple 공개키 조회
     * https://appleid.apple.com/auth/keys 에서 JWK 형식으로 제공
     */
    private PublicKey getApplePublicKey(String kid, String alg) {
        try {
            ResponseEntity<String> response = restTemplate.getForEntity(APPLE_PUBLIC_KEYS_URL, String.class);
            JsonNode keys = objectMapper.readTree(response.getBody()).get("keys");

            for (JsonNode key : keys) {
                if (kid.equals(key.get("kid").asText()) && alg.equals(key.get("alg").asText())) {
                    String n = key.get("n").asText();
                    String e = key.get("e").asText();
                    return createRSAPublicKey(n, e);
                }
            }

            throw new IllegalStateException("일치하는 Apple 공개키를 찾을 수 없습니다.");
        } catch (Exception ex) {
            log.error("Apple 공개키 조회 실패", ex);
            throw new IllegalStateException("Apple 서버와 통신 중 오류가 발생했습니다.");
        }
    }

    /**
     * RSA 공개키 생성 (JWK의 n, e 값으로)
     */
    private PublicKey createRSAPublicKey(String n, String e) throws Exception {
        byte[] nBytes = Base64.getUrlDecoder().decode(n);
        byte[] eBytes = Base64.getUrlDecoder().decode(e);

        BigInteger modulus = new BigInteger(1, nBytes);
        BigInteger exponent = new BigInteger(1, eBytes);

        RSAPublicKeySpec spec = new RSAPublicKeySpec(modulus, exponent);
        KeyFactory factory = KeyFactory.getInstance("RSA");
        return factory.generatePublic(spec);
    }

    /**
     * Apple 회원 조회 또는 신규 생성
     */
    private Member findOrCreateAppleMember(String appleUserId, String email, String fullName) {
        // 기존 Apple 회원 조회
        Optional<Member> memberOptional =
                memberRepository.findBySocialTypeAndSocialId(SocialType.APPLE, appleUserId);

        if (memberOptional.isPresent()) {
            Member existingMember = memberOptional.get();
            log.info("기존 Apple 회원 로그인 처리 - Member ID: {}", existingMember.getId());
            return existingMember;
        }

        // 신규 회원 생성
        log.info("신규 Apple 회원 가입 진행");

        // 이메일 처리: 숨김 선택 시 프라이빗 릴레이 이메일 또는 대체 이메일 생성
        String resolvedEmail = resolveEmail(email, appleUserId);

        // 이메일 중복 체크
        if (memberRepository.existsByEmail(resolvedEmail)) {
            log.warn("이메일 중복으로 Apple 회원가입 실패 - email: {}", resolvedEmail);
            throw new IllegalStateException("이미 동일한 이메일로 가입된 계정이 존재합니다. 기존 방식으로 로그인해주세요.");
        }

        // 닉네임 처리
        String nickname = resolveNickname(fullName);

        return Member.builder()
                .email(resolvedEmail)
                .nickname(nickname)
                .profileImageExternalUrl(null)
                .profileImageKey(null)
                .role(Role.USER)
                .socialType(SocialType.APPLE)
                .socialId(appleUserId)
                .password(passwordEncoder.encode(DEFAULT_SOCIAL_PASSWORD))
                .build();
    }

    private String resolveEmail(String appleEmail, String appleUserId) {
        // Apple이 제공한 이메일이 있으면 사용
        if (appleEmail != null && !appleEmail.isBlank()) {
            return appleEmail;
        }
        // 없으면 대체 이메일 생성 (이메일 숨기기 선택 시)
        return "apple_" + appleUserId.substring(0, Math.min(appleUserId.length(), 20)) + "@privaterelay.appleid.com";
    }

    private String resolveNickname(String fullName) {
        if (fullName != null && !fullName.isBlank()) {
            return fullName.trim();
        }
        return "Apple 사용자";
    }
}
