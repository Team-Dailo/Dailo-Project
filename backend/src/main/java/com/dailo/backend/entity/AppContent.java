package com.dailo.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "app_content", uniqueConstraints = @UniqueConstraint(columnNames = "content_key"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class AppContent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "content_key", nullable = false, unique = true, length = 100)
    private String contentKey;

    @Column(name = "content_value", columnDefinition = "TEXT")
    private String contentValue;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public void updateValue(String contentValue) {
        this.contentValue = contentValue;
        this.updatedAt = LocalDateTime.now();
    }
}
