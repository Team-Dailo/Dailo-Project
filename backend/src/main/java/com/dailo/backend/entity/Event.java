package com.dailo.backend.entity;

import com.dailo.backend.domain.enums.EventCategory;
import com.dailo.backend.domain.enums.EventStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.Where;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "events")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
// delete 명령에 지우는 것이 아닌 deleted_at에 날짜를 기록
@SQLDelete(sql = "UPDATE events SET deleted_at = NOW() WHERE id = ?")
@Where(clause = "deleted_at IS NULL")
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

    @Column(name = "start_at", nullable = false)
    private LocalDateTime startAt;

    @Column(name = "end_at")
    private LocalDateTime endAt;

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

    // --- 관리자 기능 및 감사(Audit) 필드 ---

    // 주최측 연락처
    private String hostContact;

    // 관리자가 수동으로 데이터를 수정했는지 여부
    @Builder.Default
    private boolean isAdminManaged = false;

    // 생성 시간 자동 기록
    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    // 수정 시간 자동 기록
    @UpdateTimestamp
    private LocalDateTime updatedAt;

    // 삭제 시간 기록
    private LocalDateTime deletedAt;


    public void updateEvent(String title, String placeName, String placeAddress, String regionName,
                            Double latitude, Double longitude,
                            LocalDateTime startAt, LocalDateTime endAt,
                            List<EventCategory> categories, EventStatus status,
                            String thumbnailUrl, List<String> posterUrls,
                            String description, String hostContact) {
        this.title = title;
        this.placeName = placeName;
        this.placeAddress = placeAddress;
        this.regionName = regionName;
        this.latitude = latitude;
        this.longitude = longitude;
        this.startAt = startAt;
        this.endAt = endAt;
        this.categories = categories; // 리스트 교체
        this.status = status;
        this.thumbnailUrl = thumbnailUrl;
        this.posterUrls = posterUrls; // 리스트 교체
        this.description = description;
        this.hostContact = hostContact;
        this.isAdminManaged = true; // 관리자가 수정했으므로 true로 변경
    }
}