package com.dailo.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
public class RefreshToken {

    @Id
    private String keyId; // 유저의 ID (이메일 또는 고유번호)

    @Column(nullable = false, length = 1000)
    private String value;

    @Builder
    public RefreshToken(String keyId, String value) {
        this.keyId = keyId;
        this.value = value;
    }

    // 새 토큰으로 갱신하는 메서드
    public RefreshToken updateValue(String token) {
        this.value = token;
        return this;
    }
}