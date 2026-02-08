package com.dailo.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "search_logs", indexes = {
        @Index(name = "idx_search_log_user_id", columnList = "user_id"),
        @Index(name = "idx_search_log_keyword", columnList = "keyword"),
        @Index(name = "idx_search_log_created_at", columnList = "created_at"),
        @Index(name = "idx_search_log_request_id", columnList = "request_id")
})
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SearchLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;  // nullable - 비로그인 검색도 기록

    @Column(nullable = false)
    private String keyword;

    @Column(columnDefinition = "TEXT")
    private String filters;  // JSON 형태로 필터 조건 저장

    @Column(name = "result_count")
    @Builder.Default
    private Integer resultCount = 0;

    @Column(name = "request_id")
    private String requestId;  // 요청 추적용

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
