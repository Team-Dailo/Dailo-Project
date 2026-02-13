package com.dailo.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

// 사용자별 FCM 토큰 저장 갱신

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "push_tokens")
public class PushToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @Column(nullable = false, unique = true)
    private String token; // FCM

    @Column(nullable = false)
    private String deviceType; // ANDROID, IOS

    private LocalDateTime lastUpdatedAt;

    @Builder
    public PushToken(Member member, String token, String deviceType) {
        this.member = member;
        this.token = token;
        this.deviceType = deviceType;
        this.lastUpdatedAt = LocalDateTime.now();
    }

    public void updateToken(String token) {
        this.token = token;
        this.lastUpdatedAt = LocalDateTime.now();
    }
}