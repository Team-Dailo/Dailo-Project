package com.dailo.backend.entity;

import com.dailo.backend.domain.enums.EventStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(name = "event_histories")
public class EventHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 어떤 행사의 기록인지 연결
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id")
    private Event event;

    // --- 수정 전 스냅샷 (저장하고 싶은 주요 데이터) ---
    private String title;

    @Enumerated(EnumType.STRING)
    private EventStatus status;

    private LocalDateTime startAt;
    private LocalDateTime endAt;

    // 누가 바꿨는지 (추후 구현)

    @CreationTimestamp
    private LocalDateTime changedAt; // 변경된 시간
}