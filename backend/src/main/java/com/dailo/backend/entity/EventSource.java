package com.dailo.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "event_sources", uniqueConstraints = {
        @UniqueConstraint(name = "uk_event_source_type_external", columnNames = {"source_type", "external_id"})
})
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventSource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @Column(name = "source_type", nullable = false)
    private String sourceType;

    @Column(name = "external_id", nullable = false)
    private String externalId;

    @Column(name = "raw_data", columnDefinition = "TEXT")
    private String rawData;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
