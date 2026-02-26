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

    private String profileImageUrl;

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


    /* ================= 비즈니스 메서드 ================= */


    public void withdraw() {
        this.status = MemberStatus.DELETED;
    }

    public void updateProfile(String nickname, String profileImageUrl) {
        // 닉네임이 null이거나 비어있지 않을 때만 업데이트 (안전장치)
        if (nickname != null && !nickname.isBlank()) {
            this.nickname = nickname.trim();
        }
        this.profileImageUrl = profileImageUrl;
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


    /* ================= 생성자 ================= */

    @Builder
    public Member(String email,
                  String password,
                  String nickname,
                  Role role,
                  SocialType socialType,
                  String socialId,
                  String profileImageUrl) {

        this.email = email;
        this.password = password;
        this.nickname = nickname;

        this.role = role != null ? role : Role.USER;

        // 가입하는 순간 무조건 정상 회원 처리 & 이메일 인증 시각 기록
        this.status = MemberStatus.ACTIVE;
        this.emailVerifiedAt = LocalDateTime.now();

        this.socialType = socialType != null ? socialType : SocialType.LOCAL;
        this.socialId = socialId;

        this.profileImageUrl = profileImageUrl;
    }

}