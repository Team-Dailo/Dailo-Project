package com.dailo.backend.entity;

import com.dailo.backend.domain.enums.EmailTokenType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
@Table(
        name = "email_token",
        indexes = {
                @Index(
                        name = "idx_email_type_created",
                        columnList = "email,type,created_at"
                )
        }
)
public class EmailToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 해시값만 저장 (보안)
    @Column(nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EmailTokenType type;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private Member member;

    // 요청 이메일
    @Column(nullable = false)
    private String email;

    // 만료 시각
    @Column(nullable = false)
    private LocalDateTime expiresAt;

    // 사용 시각
    private LocalDateTime usedAt;

    // 생성 시각
    @CreatedDate
    @Column(
            name = "created_at",
            updatable = false,
            nullable = false
    )
    private LocalDateTime createdAt;


    @Builder
    public EmailToken(
            String tokenHash,
            EmailTokenType type,
            Member member,
            String email,
            LocalDateTime expiresAt
    ) {
        this.tokenHash = tokenHash;
        this.type = type;
        this.member = member;
        this.email = email;
        this.expiresAt = expiresAt;
    }


    /* ===========================
        토큰 사용 처리
     =========================== */
    public void useToken() {
        this.usedAt = LocalDateTime.now();
    }


    /* ===========================
        유효성 검사
     =========================== */
    public boolean isValid(LocalDateTime now) {

        if (usedAt != null) {
            return false;
        }

        return now.isBefore(expiresAt);
    }
}