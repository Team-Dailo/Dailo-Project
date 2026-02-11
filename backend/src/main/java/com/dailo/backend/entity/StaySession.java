package com.dailo.backend.entity;

import com.dailo.backend.domain.enums.StayStatus;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class StaySession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @CreatedDate
    private LocalDateTime startTime; // 체류 시작 시간

    private LocalDateTime endTime;   // 체류 종료 시간

    @Enumerated(EnumType.STRING)
    private StayStatus status; // PENDING(진행중), COMPLETED(완료), FRAUD(부정행위)

    // 부정 방지용 마지막 좌표 기록
    private Double lastLatitude;
    private Double lastLongitude;

    @Builder
    public StaySession(Member member, Event event, Double lat, Double lng) {
        this.member = member;
        this.event = event;
        this.lastLatitude = lat;
        this.lastLongitude = lng;
        this.status = StayStatus.PENDING;
        this.startTime = LocalDateTime.now(); // 생성 시점 = 시작 시점
    }

    // 체류 완료 처리 메서드
    public void completeSession() {
        this.status = StayStatus.COMPLETED;
        this.endTime = LocalDateTime.now();
    }

    // 부정 행위 발각 처리
    public void markAsFraud() {
        this.status = StayStatus.FRAUD;
        this.endTime = LocalDateTime.now();
    }
}