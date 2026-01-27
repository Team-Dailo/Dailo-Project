package com.dailo.backend.entity;

import com.dailo.backend.domain.enums.EventCategory;
import com.dailo.backend.domain.enums.EventStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "events")
@Getter
//@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(length = 100)
    private String regionName; // 지역(서울, 경기) -> 필터링용

    @Column(length = 100)
    private String placeName; // 장소이름

    @Column(length = 200)
    private String placeAddress; // 주소

    private Double latitude;
    private Double longitude;

    // +Time 시간 포함 명시
    @Column(name = "start_date", nullable = false)
    private LocalDateTime startDateTime;

    @Column(name = "end_date")
    private LocalDateTime endDateTime;

    @Column(length = 255)
    private String thumbnailUrl;

    @ElementCollection(targetClass = EventCategory.class)
    @CollectionTable(name = "event_categories", joinColumns = @JoinColumn(name = "event_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "category")
    @Builder.Default
    private List<EventCategory> categories = new ArrayList<>();

    // 공개/비공개 관리
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private EventStatus status = EventStatus.DRAFT;

    // 상세 포스터 이미지(고화질)
    @ElementCollection
    @CollectionTable(name = "event_poster_images", joinColumns = @JoinColumn(name = "event_id"))
    @Column(name = "image_url")
    @Builder.Default
    private List<String> posterUrls = new ArrayList<>();

    @Column(columnDefinition = "TEXT")
    private String description;
}