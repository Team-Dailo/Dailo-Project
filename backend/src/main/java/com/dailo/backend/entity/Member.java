package com.dailo.backend.entity;

import com.dailo.backend.domain.enums.MemberStatus;
import com.dailo.backend.domain.enums.Role;
import com.dailo.backend.domain.enums.SocialType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = true)
    private String password;

    @Column(nullable = false)
    private String nickname;

    @Column(name = "profile_image_key")
    private String profileImageKey;

    @Column(name = "profile_image_external_url", length = 1000)
    private String profileImageExternalUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MemberStatus status = MemberStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SocialType socialType;

    private String socialId;

    @Column(name = "suspended_until")
    private LocalDateTime suspendedUntil;

    @Column(name = "email_verified_at")
    private LocalDateTime emailVerifiedAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }

    public void withdraw() {
        this.status = MemberStatus.DELETED;
    }

    public void updateProfile(String nickname, String profileImageExternalUrl) {
        if (nickname != null && !nickname.isBlank()) {
            this.nickname = nickname.trim();
        }

        if (profileImageExternalUrl != null) {
            this.profileImageExternalUrl = profileImageExternalUrl;
            this.profileImageKey = null;
        }
    }

    public void updateProfileImageKey(String profileImageKey) {
        this.profileImageKey = profileImageKey;
        this.profileImageExternalUrl = null;
    }

    public void clearProfileImage() {
        this.profileImageKey = null;
        this.profileImageExternalUrl = null;
    }

    public void changePassword(String encodedPassword) {
        this.password = encodedPassword;
    }

    public boolean isSuspended() {
        return suspendedUntil != null &&
                suspendedUntil.isAfter(LocalDateTime.now());
    }

    public void setSuspendedUntil(LocalDateTime until) {
        this.suspendedUntil = until;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    // 기존 코드 호환용 getter
    public String getProfileImageUrl() {
        if (this.profileImageKey != null && !this.profileImageKey.isBlank()) {
            return this.profileImageKey;
        }

        if (this.profileImageExternalUrl != null && !this.profileImageExternalUrl.isBlank()) {
            return this.profileImageExternalUrl;
        }

        return null;
    }

    @Builder
    public Member(String email,
                  String password,
                  String nickname,
                  Role role,
                  SocialType socialType,
                  String socialId,
                  String profileImageKey,
                  String profileImageExternalUrl) {

        this.email = email;
        this.password = password;
        this.nickname = nickname;

        this.role = role != null ? role : Role.USER;

        this.status = MemberStatus.ACTIVE;
        this.emailVerifiedAt = LocalDateTime.now();

        this.socialType = socialType != null ? socialType : SocialType.LOCAL;
        this.socialId = socialId;

        this.profileImageKey = profileImageKey;
        this.profileImageExternalUrl = profileImageExternalUrl;
    }
}