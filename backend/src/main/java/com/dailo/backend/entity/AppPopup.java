package com.dailo.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "app_popups")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class AppPopup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "link_url", length = 500)
    private String linkUrl;

    @Column(name = "display_order")
    @Builder.Default
    private Integer displayOrder = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "start_at")
    private LocalDateTime startAt;

    @Column(name = "end_at")
    private LocalDateTime endAt;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public void update(String title, String imageUrl, String linkUrl,
                       Integer displayOrder, LocalDateTime startAt, LocalDateTime endAt) {
        this.title = title;
        this.imageUrl = imageUrl;
        this.linkUrl = linkUrl;
        this.displayOrder = displayOrder;
        this.startAt = startAt;
        this.endAt = endAt;
    }

    public void activate() { this.isActive = true; }
    public void deactivate() { this.isActive = false; }

    public boolean isCurrentlyActive() {
        if (!this.isActive) return false;
        LocalDateTime now = LocalDateTime.now();
        if (this.startAt != null && now.isBefore(this.startAt)) return false;
        if (this.endAt != null && now.isAfter(this.endAt)) return false;
        return true;
    }
}
