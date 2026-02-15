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

    /** 규모/달력 필터 (CHUNGJU_CITY, UNIVERSITY, COLLEGE, CLUB 등) → 지도 마커 색상용 */
    @Column(name = "filter_group", length = 50)
    private String filterGroup;

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
    @Column(name = "category", length = 50)
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

    @Column(name = "like_count")
    @Builder.Default
    private Integer likeCount = 0;

    /** 최근 7일 조회수 (클릭 로그 집계, 스케줄러로 갱신) - 지금 뜨는 축제 정렬용 */
    @Column(name = "view_count_7d")
    @Builder.Default
    private Integer viewCount7d = 0;

    /** 최근 30일 조회수 (클릭 로그 집계, 스케줄러로 갱신) - 조회수 많은 순 정렬용 */
    @Column(name = "view_count_30d")
    @Builder.Default
    private Integer viewCount30d = 0;

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

    /** 스케줄러: 최근 7일/30일 조회수 갱신용 */
    public void setViewCount7d(Integer viewCount7d) { this.viewCount7d = viewCount7d != null ? viewCount7d : 0; }
    public void setViewCount30d(Integer viewCount30d) { this.viewCount30d = viewCount30d != null ? viewCount30d : 0; }

    public void updateEvent(String title, String placeName, String placeAddress, String regionName,
                            Double latitude, Double longitude,
                            LocalDateTime startAt, LocalDateTime endAt,
                            List<EventCategory> categories, EventStatus status,
                            String thumbnailUrl, List<String> posterUrls,
                            String description, String hostContact,
                            String filterGroup) {
        this.title = title;
        this.placeName = placeName;
        this.placeAddress = placeAddress;
        this.regionName = regionName;
        this.latitude = latitude;
        this.longitude = longitude;
        this.startAt = startAt;
        this.endAt = endAt;
        this.categories = categories;
        this.status = status;
        this.thumbnailUrl = thumbnailUrl;
        this.posterUrls = posterUrls;
        this.description = description;
        this.hostContact = hostContact;
        this.filterGroup = filterGroup;
        this.isAdminManaged = true;
    }
}