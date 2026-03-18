package com.dailo.backend.entity;

import jakarta.persistence.*;
import lombok.*;

// 알림 구독 옵션 관리

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "notification_settings")
public class NotificationSetting {

    @Id
    private Long memberId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "member_id")
    private Member member;

    private boolean isNewEventEnabled; // 신규 행사 알림 여부
    private boolean isEventReminderEnabled; // 행사 시작 전 알림 여부

    private String subscribedCategories; // 구독 카테고리
    private String subscribedRegions; // 구독 지역

    @Builder
    public NotificationSetting(Member member, boolean isNewEventEnabled, boolean isEventReminderEnabled) {
        this.member = member;
        this.isNewEventEnabled = isNewEventEnabled;
        this.isEventReminderEnabled = isEventReminderEnabled;
    }

    public void updateSettings(boolean newEventEnabled, boolean eventReminderEnabled, String categories, String regions) {
        this.isNewEventEnabled = newEventEnabled;
        this.isEventReminderEnabled = eventReminderEnabled;
        this.subscribedCategories = categories;
        this.subscribedRegions = regions;
    }
}