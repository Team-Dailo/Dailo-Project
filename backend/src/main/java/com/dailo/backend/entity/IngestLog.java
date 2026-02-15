package com.dailo.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ingest_logs")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IngestLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_id", nullable = false)
    private String batchId;

    @Column(nullable = false)
    private String source;

    @Column(name = "total_count")
    @Builder.Default
    private Integer totalCount = 0;

    @Column(name = "success_count")
    @Builder.Default
    private Integer successCount = 0;

    @Column(name = "fail_count")
    @Builder.Default
    private Integer failCount = 0;

    @Column(name = "error_summary", columnDefinition = "TEXT")
    private String errorSummary;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // 비즈니스 메서드
    public void updateCounts(int total, int success, int fail) {
        this.totalCount = total;
        this.successCount = success;
        this.failCount = fail;
    }

    public void setErrorSummary(String errorSummary) {
        this.errorSummary = errorSummary;
    }
}
