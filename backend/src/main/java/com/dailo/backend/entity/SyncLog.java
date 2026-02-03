package com.dailo.backend.entity;

import com.dailo.backend.domain.enums.SyncStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "sync_logs")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SyncLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "source_type", nullable = false)
    private String sourceType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SyncStatus status = SyncStatus.STARTED;

    @Column(name = "total_count")
    @Builder.Default
    private Integer totalCount = 0;

    @Column(name = "success_count")
    @Builder.Default
    private Integer successCount = 0;

    @Column(name = "fail_count")
    @Builder.Default
    private Integer failCount = 0;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "started_at", nullable = false, updatable = false)
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @PrePersist
    protected void onCreate() {
        this.startedAt = LocalDateTime.now();
    }

    // 동기화 성공 완료 (상태 검증은 Service에서 수행)
    public void completeAsSuccess(int totalCount, int successCount, int failCount) {
        this.status = SyncStatus.SUCCESS;
        this.totalCount = totalCount;
        this.successCount = successCount;
        this.failCount = failCount;
        this.completedAt = LocalDateTime.now();
    }

    // 동기화 실패 완료 (상태 검증은 Service에서 수행)
    public void completeAsFailed(String errorMessage) {
        this.status = SyncStatus.FAILED;
        this.errorMessage = errorMessage;
        this.completedAt = LocalDateTime.now();
    }

    // 부분 성공 (상태 검증은 Service에서 수행)
    public void completeWithPartialSuccess(int totalCount, int successCount, int failCount, String errorMessage) {
        this.status = failCount > 0 ? SyncStatus.FAILED : SyncStatus.SUCCESS;
        this.totalCount = totalCount;
        this.successCount = successCount;
        this.failCount = failCount;
        this.errorMessage = errorMessage;
        this.completedAt = LocalDateTime.now();
    }
}
