package com.dailo.backend.repository;

import com.dailo.backend.domain.enums.EmailTokenType;
import com.dailo.backend.entity.EmailToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface EmailTokenRepository extends JpaRepository<EmailToken, Long> {

    // 최근 발급 토큰
    Optional<EmailToken>
    findTopByEmailAndTypeOrderByCreatedAtDesc(
            String email,
            EmailTokenType type
    );

    // 최근 미사용 토큰
    Optional<EmailToken>
    findTopByEmailAndTypeAndUsedAtIsNullOrderByCreatedAtDesc(
            String email,
            EmailTokenType type
    );

    // 유효한 토큰 직접 조회 (검증용)
    Optional<EmailToken>
    findByTokenHashAndTypeAndUsedAtIsNullAndExpiresAtAfter(
            String tokenHash,
            EmailTokenType type,
            LocalDateTime now
    );
}