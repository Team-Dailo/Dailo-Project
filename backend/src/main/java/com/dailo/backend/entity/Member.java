package com.dailo.backend.entity;

import com.dailo.backend.domain.enums.MemberStatus;
import com.dailo.backend.domain.enums.Role;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

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
        if (role != null) {
            this.role = role;
        }
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