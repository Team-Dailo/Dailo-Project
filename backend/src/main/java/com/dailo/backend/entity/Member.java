package com.dailo.backend.entity;

import com.dailo.backend.domain.enums.MemberStatus;
import com.dailo.backend.domain.enums.Role;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

import jakarta.persistence.PrePersist;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "created_at", updatable = false, nullable = true)
    private LocalDateTime createdAt;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String nickname;

    @Column(name = "profile_image_url")
    private String profileImageUrl;

    @Enumerated(EnumType.STRING)
    private MemberStatus status; // ACTIVATE, DELETED

    @Enumerated(EnumType.STRING)
    private Role role;

    /** 정지 해제일 (null = 미정지, 과거 = 이미 해제, 미래 = 정지 중, 영구정지 시 매우 먼 미래) */
    @Column(name = "suspended_until")
    private LocalDateTime suspendedUntil;

    public void updateProfile(String nickname, String profileImageUrl) {
        if (nickname != null && !nickname.isEmpty()) {
            this.nickname = nickname;
        }
        if (profileImageUrl != null && !profileImageUrl.isEmpty()) {
            this.profileImageUrl = profileImageUrl;
        }
    }

    public void withdraw() {
        this.status = MemberStatus.DELETED;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    /** 관리자 정지: 해제일 설정 (null = 정지해제) */
    public void setSuspendedUntil(LocalDateTime suspendedUntil) {
        this.suspendedUntil = suspendedUntil;
    }

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    /** 현재 정지 중인지 (suspendedUntil != null 이고 미래일 때) */
    public boolean isSuspended() {
        return suspendedUntil != null && suspendedUntil.isAfter(LocalDateTime.now());
    }

    @Builder
    public Member(String email, String password, String nickname, Role role) {
        this.email = email;
        this.password = password;
        this.nickname = nickname;
        this.role = role;
        this.status = MemberStatus.ACTIVE;
    }
}