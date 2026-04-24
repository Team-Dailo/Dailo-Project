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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;
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

    // application.yml에서 설정 (없으면 기본값 사용)
    @Value("${apple.client-id:com.knut.dailo}")
    private String appleClientId;

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenProvider tokenProvider;
    private final RestTemplate restTemplate;
    private final RefreshTokenRepository refreshTokenRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public TokenDto loginWithApple(AppleLoginRequestDto request) {
        log.info("[Apple Login] 로그인 시도 시작");
        log.debug("[Apple Login] Request - user: {}, email: {}, fullName: {}, identityToken length: {}",
                request.getUser(),
                request.getEmail(),
                request.getFullName(),
                request.getIdentityToken() != null ? request.getIdentityToken().length() : 0);

        try {
            // 1. identityToken 검증
            Claims claims = verifyIdentityToken(request.getIdentityToken());
            log.info("[Apple Login] JWT 검증 성공");

            // 2. Apple 사용자 ID (sub claim)
            String appleUserId = claims.getSubject();
            if (appleUserId == null || appleUserId.isBlank()) {
                log.error("[Apple Login] Apple 사용자 ID(sub)가 없습니다. claims: {}", claims);
                throw new IllegalArgumentException("Apple 사용자 ID를 가져올 수 없습니다.");
            }
            log.info("[Apple Login] Apple User ID: {}", appleUserId.substring(0, Math.min(10, appleUserId.length())) + "...");

            // 3. 이메일 추출 (JWT claims 또는 request에서)
            String email = claims.get("email", String.class);
            if ((email == null || email.isBlank()) && request.getEmail() != null) {
                email = request.getEmail();
            }
            log.info("[Apple Login] 이메일: {}", email != null ? email : "(없음 - 대체 이메일 생성 예정)");

            // 4. 회원 조회 또는 생성
            Member member = findOrCreateAppleMember(appleUserId, email, request.getFullName());
            Member savedMember = memberRepository.save(member);
            log.info("[Apple Login] 회원 저장 완료 - Member ID: {}", savedMember.getId());

            // 5. JWT 토큰 발급
            TokenDto tokenDto = tokenProvider.generateTokenDtoForMember(
                    savedMember.getEmail(),
                    savedMember.getRole() != null ? savedMember.getRole().name() : Role.USER.name()
            );
            log.info("[Apple Login] JWT 토큰 발급 완료");

            // 6. Refresh Token 저장
            RefreshToken refreshToken = RefreshToken.builder()
                    .keyId(savedMember.getEmail())
                    .value(tokenDto.getRefreshToken())
                    .build();
            refreshTokenRepository.save(refreshToken);
            log.info("[Apple Login] Refresh Token 저장 완료");

            log.info("[Apple Login] 로그인 성공 - Member ID: {}, email: {}", savedMember.getId(), savedMember.getEmail());
            return tokenDto;

        } catch (IllegalArgumentException | IllegalStateException e) {
            // 이미 적절한 메시지가 있는 예외는 그대로 던짐
            log.warn("[Apple Login] 로그인 실패 - {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            // 예상치 못한 예외
            log.error("[Apple Login] 예상치 못한 오류 발생", e);
            throw new IllegalStateException("Apple 로그인 처리 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    /**
     * Apple identityToken (JWT) 검증
     * Apple 공개키를 가져와서 서명 검증
     */
    private Claims verifyIdentityToken(String identityToken) {
        if (identityToken == null || identityToken.isBlank()) {
            log.error("[Apple JWT] identityToken이 null 또는 빈 문자열");
            throw new IllegalArgumentException("Apple identityToken이 없습니다.");
        }

        try {
            // JWT 헤더에서 kid 추출
            String[] parts = identityToken.split("\\.");
            if (parts.length != 3) {
                log.error("[Apple JWT] 잘못된 JWT 형식 - parts: {}", parts.length);
                throw new IllegalArgumentException("잘못된 JWT 형식입니다.");
            }

            String headerJson = new String(Base64.getUrlDecoder().decode(parts[0]));
            log.debug("[Apple JWT] Header: {}", headerJson);

            JsonNode header = objectMapper.readTree(headerJson);
            String kid = header.get("kid").asText();
            String alg = header.get("alg").asText();
            log.info("[Apple JWT] kid: {}, alg: {}", kid, alg);

            // Payload 미리 확인 (디버깅용)
            String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]));
            JsonNode payload = objectMapper.readTree(payloadJson);
            log.debug("[Apple JWT] Payload: {}", payloadJson);
            log.info("[Apple JWT] iss: {}, aud: {}, sub: {}",
                    payload.has("iss") ? payload.get("iss").asText() : "N/A",
                    payload.has("aud") ? payload.get("aud").asText() : "N/A",
                    payload.has("sub") ? payload.get("sub").asText().substring(0, 10) + "..." : "N/A");

            // Apple 공개키 가져오기
            PublicKey publicKey = getApplePublicKey(kid, alg);
            log.info("[Apple JWT] 공개키 조회 성공");

            // JWT 검증 및 Claims 추출
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(publicKey)
                    .requireIssuer(APPLE_ISSUER)
                    .requireAudience(appleClientId)  // Bundle ID 검증 추가!
                    .build()
                    .parseClaimsJws(identityToken)
                    .getBody();

            log.info("[Apple JWT] JWT 검증 성공 - sub: {}", claims.getSubject().substring(0, 10) + "...");
            return claims;

        } catch (io.jsonwebtoken.ExpiredJwtException e) {
            log.warn("[Apple JWT] 토큰 만료됨 - expiration: {}", e.getClaims().getExpiration());
            throw new IllegalArgumentException("Apple 로그인 토큰이 만료되었습니다. 다시 로그인해주세요.");
        } catch (io.jsonwebtoken.IncorrectClaimException e) {
            log.error("[Apple JWT] Claim 불일치 - {}", e.getMessage());
            if (e.getMessage().contains("aud")) {
                throw new IllegalArgumentException("Apple 토큰의 앱 ID가 일치하지 않습니다. (aud mismatch)");
            }
            if (e.getMessage().contains("iss")) {
                throw new IllegalArgumentException("Apple 토큰의 발급자가 올바르지 않습니다. (iss mismatch)");
            }
            throw new IllegalArgumentException("Apple 토큰 검증 실패: " + e.getMessage());
        } catch (io.jsonwebtoken.MalformedJwtException e) {
            log.error("[Apple JWT] 잘못된 JWT 형식 - {}", e.getMessage());
            throw new IllegalArgumentException("Apple 토큰 형식이 올바르지 않습니다.");
        } catch (io.jsonwebtoken.SignatureException e) {
            log.error("[Apple JWT] 서명 검증 실패 - {}", e.getMessage());
            throw new IllegalArgumentException("Apple 토큰 서명이 유효하지 않습니다.");
        } catch (io.jsonwebtoken.JwtException e) {
            log.warn("[Apple JWT] JWT 검증 실패: {}", e.getMessage());
            throw new IllegalArgumentException("Apple 로그인 토큰이 유효하지 않습니다: " + e.getMessage());
        } catch (IllegalArgumentException e) {
            // Base64 디코딩 실패 등
            log.error("[Apple JWT] 토큰 파싱 오류 - {}", e.getMessage());
            throw new IllegalArgumentException("Apple 토큰을 파싱할 수 없습니다: " + e.getMessage());
        } catch (Exception e) {
            log.error("[Apple JWT] 검증 중 예상치 못한 오류", e);
            throw new IllegalStateException("Apple 토큰 검증 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    /**
     * Apple 공개키 조회
     * https://appleid.apple.com/auth/keys 에서 JWK 형식으로 제공
     */
    private PublicKey getApplePublicKey(String kid, String alg) {
        try {
            log.debug("[Apple Key] Apple 공개키 조회 시작 - URL: {}", APPLE_PUBLIC_KEYS_URL);
            ResponseEntity<String> response = restTemplate.getForEntity(APPLE_PUBLIC_KEYS_URL, String.class);

            if (response.getBody() == null) {
                log.error("[Apple Key] Apple 공개키 응답이 비어있음");
                throw new IllegalStateException("Apple 서버에서 공개키를 받지 못했습니다.");
            }

            log.debug("[Apple Key] Apple 응답: {}", response.getBody().substring(0, Math.min(200, response.getBody().length())) + "...");

            JsonNode keys = objectMapper.readTree(response.getBody()).get("keys");
            if (keys == null || !keys.isArray()) {
                log.error("[Apple Key] keys 배열이 없음");
                throw new IllegalStateException("Apple 공개키 형식이 올바르지 않습니다.");
            }

            for (JsonNode key : keys) {
                String keyKid = key.has("kid") ? key.get("kid").asText() : "";
                String keyAlg = key.has("alg") ? key.get("alg").asText() : "";

                if (kid.equals(keyKid) && alg.equals(keyAlg)) {
                    String n = key.get("n").asText();
                    String e = key.get("e").asText();
                    log.info("[Apple Key] 일치하는 키 발견 - kid: {}", kid);
                    return createRSAPublicKey(n, e);
                }
            }

            log.error("[Apple Key] 일치하는 키를 찾을 수 없음 - 요청 kid: {}, alg: {}", kid, alg);
            throw new IllegalStateException("일치하는 Apple 공개키를 찾을 수 없습니다. (kid: " + kid + ")");

        } catch (RestClientException e) {
            log.error("[Apple Key] Apple 서버 통신 실패", e);
            throw new IllegalStateException("Apple 서버와 통신할 수 없습니다. 잠시 후 다시 시도해주세요.");
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            log.error("[Apple Key] 공개키 조회 중 오류", e);
            throw new IllegalStateException("Apple 공개키 조회 중 오류가 발생했습니다: " + e.getMessage());
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
            log.info("[Apple Member] 기존 회원 로그인 - Member ID: {}", existingMember.getId());
            return existingMember;
        }

        // 신규 회원 생성
        log.info("[Apple Member] 신규 회원 가입 시작");

        // 이메일 처리: 숨김 선택 시 프라이빗 릴레이 이메일 또는 대체 이메일 생성
        String resolvedEmail = resolveEmail(email, appleUserId);
        log.info("[Apple Member] 해결된 이메일: {}", resolvedEmail);

        // 이메일 중복 체크
        if (memberRepository.existsByEmail(resolvedEmail)) {
            log.warn("[Apple Member] 이메일 중복 - email: {}", resolvedEmail);
            throw new IllegalStateException("이미 동일한 이메일로 가입된 계정이 존재합니다. 기존 방식으로 로그인해주세요.");
        }

        // 닉네임 처리
        String nickname = resolveNickname(fullName);
        log.info("[Apple Member] 닉네임: {}", nickname);

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
