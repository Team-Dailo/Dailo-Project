package com.dailo.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "app_versions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class AppVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 10)
    private String platform;  // IOS, ANDROID

    @Column(name = "minimum_version", nullable = false, length = 20)
    private String minimumVersion;  // 최소 지원 버전

    @Column(name = "latest_version", nullable = false, length = 20)
    private String latestVersion;  // 최신 버전

    @Column(name = "force_update", nullable = false)
    @Builder.Default
    private Boolean forceUpdate = false;  // 강제 업데이트 여부

    @Column(name = "update_message", length = 500)
    private String updateMessage;  // 업데이트 안내 메시지

    @Column(name = "store_url", length = 500)
    private String storeUrl;  // 스토어 URL

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void update(String minimumVersion, String latestVersion, Boolean forceUpdate,
                       String updateMessage, String storeUrl) {
        this.minimumVersion = minimumVersion;
        this.latestVersion = latestVersion;
        this.forceUpdate = forceUpdate;
        this.updateMessage = updateMessage;
        this.storeUrl = storeUrl;
    }
}
