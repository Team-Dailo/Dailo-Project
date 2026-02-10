package com.dailo.backend.entity;

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

    @Enumerated(EnumType.STRING)
    private Role role;

    @Builder
    public Member(String email, String password, String nickname, Role role) {
        this.email = email;
        this.password = password;
        this.nickname = nickname;
        this.role = role;
    }

    /** 닉네임 변경 */
    public void updateNickname(String nickname) {
        if (nickname == null || nickname.isBlank()) {
            throw new IllegalArgumentException("닉네임을 입력해 주세요.");
        }
        this.nickname = nickname.trim();
    }

    /** 관리자 지정 등 역할 변경 (시스템/초기화용) */
    public void setRole(Role role) {
        this.role = role != null ? role : Role.USER;
    }
}