package com.dailo.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

// 실제 발송된 알림 내역 로그 관리

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "notifications")
public class NotificationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private Member member;

    private String title;
    private String body;
    private boolean isRead;
    private LocalDateTime sentAt;

    @Builder
    public NotificationLog(Member member, String title, String body) {
        this.member = member;
        this.title = title;
        this.body = body;
        this.isRead = false;
        this.sentAt = LocalDateTime.now();
    }
}