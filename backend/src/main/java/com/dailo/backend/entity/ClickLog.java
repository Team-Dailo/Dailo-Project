package com.dailo.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "click_logs", indexes = {
        @Index(name = "idx_click_log_user_id", columnList = "user_id"),
        @Index(name = "idx_click_log_event_id", columnList = "event_id"),
        @Index(name = "idx_click_log_created_at", columnList = "created_at"),
        @Index(name = "idx_click_log_request_id", columnList = "request_id")
})
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClickLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;  // nullable - 비로그인 클릭도 기록

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(nullable = false)
    private String source;  // 유입 경로 (search, list, recommendation 등)

    @Column(name = "request_id")
    private String requestId;  // 검색 로그와 연결용

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
