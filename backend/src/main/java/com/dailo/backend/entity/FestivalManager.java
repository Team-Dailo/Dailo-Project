package com.dailo.backend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * 축제 관리자 할당 테이블
 * 특정 회원이 특정 축제를 관리할 수 있는 권한을 부여
 */
@Entity
@Table(name = "festival_managers",
        uniqueConstraints = @UniqueConstraint(columnNames = {"member_id", "event_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FestivalManager {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "created_by")
    private Long createdBy;

    @Builder
    public FestivalManager(Member member, Event event, Long createdBy) {
        this.member = member;
        this.event = event;
        this.createdBy = createdBy;
    }
}
