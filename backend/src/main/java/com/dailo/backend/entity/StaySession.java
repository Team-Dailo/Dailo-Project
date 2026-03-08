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
    @Column(nullable = false, updatable = false)
    private LocalDateTime startTime;

    private LocalDateTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private StayStatus status = StayStatus.PENDING;

    private Double lastLatitude;
    private Double lastLongitude;

    private LocalDateTime lastPingTime;

    @Builder
    public StaySession(Member member, Event event, Double lat, Double lng) {
        this.member = member;
        this.event = event;
        this.lastLatitude = lat;
        this.lastLongitude = lng;
        this.status = StayStatus.PENDING;
        this.lastPingTime = LocalDateTime.now();
    }

    public void completeSession() {
        this.status = StayStatus.COMPLETED;
        this.endTime = LocalDateTime.now();
    }

    public void markAsFraud() {
        this.status = StayStatus.FRAUD;
        this.endTime = LocalDateTime.now();
    }

    public void updateLocation(Double lat, Double lng) {
        this.lastLatitude = lat;
        this.lastLongitude = lng;
        this.lastPingTime = LocalDateTime.now();
    }
}