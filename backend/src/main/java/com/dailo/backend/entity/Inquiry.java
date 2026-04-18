package com.dailo.backend.entity;

import com.dailo.backend.domain.enums.InquiryStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 앱 내 문의하기 폼에서 제출된 문의.
 * 비로그인 사용자도 문의 가능 (memberId nullable).
 */
@Entity
@Table(name = "inquiries")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Inquiry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "member_id")
    private Long memberId;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private InquiryStatus status = InquiryStatus.PENDING;

    @Column(columnDefinition = "TEXT")
    private String answer;

    @Column(name = "answered_at")
    private LocalDateTime answeredAt;

    @Column(name = "answered_by")
    private Long answeredBy;

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        if (this.status == null) {
            this.status = InquiryStatus.PENDING;
        }
    }

    public void answer(String answer, Long adminId) {
        this.answer = answer;
        this.answeredBy = adminId;
        this.answeredAt = LocalDateTime.now();
        this.status = InquiryStatus.ANSWERED;
    }

    public void close() {
        this.status = InquiryStatus.CLOSED;
    }
}
