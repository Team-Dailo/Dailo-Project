package com.dailo.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "banners")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Banner {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "link_url", length = 500)
    private String linkUrl;  // 클릭 시 이동할 URL

    @Column(name = "link_type", length = 20)
    @Builder.Default
    private String linkType = "EXTERNAL";  // EXTERNAL, EVENT, POST, NOTICE

    @Column(name = "link_id")
    private Long linkId;  // linkType이 EVENT, POST, NOTICE일 때 해당 ID

    @Column(name = "display_order")
    @Builder.Default
    private Integer displayOrder = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "start_at")
    private LocalDateTime startAt;  // 노출 시작 시간

    @Column(name = "end_at")
    private LocalDateTime endAt;  // 노출 종료 시간

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

    public void update(String title, String imageUrl, String linkUrl, String linkType,
                       Long linkId, Integer displayOrder, LocalDateTime startAt, LocalDateTime endAt) {
        this.title = title;
        this.imageUrl = imageUrl;
        this.linkUrl = linkUrl;
        this.linkType = linkType;
        this.linkId = linkId;
        this.displayOrder = displayOrder;
        this.startAt = startAt;
        this.endAt = endAt;
    }

    public void activate() {
        this.isActive = true;
    }

    public void deactivate() {
        this.isActive = false;
    }

    public boolean isCurrentlyActive() {
        if (!this.isActive) return false;

        LocalDateTime now = LocalDateTime.now();
        if (this.startAt != null && now.isBefore(this.startAt)) return false;
        if (this.endAt != null && now.isAfter(this.endAt)) return false;

        return true;
    }
}
