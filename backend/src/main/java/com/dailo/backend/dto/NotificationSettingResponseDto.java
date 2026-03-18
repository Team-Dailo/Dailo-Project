package com.dailo.backend.dto;

import com.dailo.backend.entity.NotificationSetting;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class NotificationSettingResponseDto {
    private Long memberId;
    private boolean newEventEnabled;
    private boolean eventReminderEnabled;
    private String subscribedCategories;
    private String subscribedRegions;

    public static NotificationSettingResponseDto from(NotificationSetting setting) {
        return NotificationSettingResponseDto.builder()
                .memberId(setting.getMemberId())
                .newEventEnabled(setting.isNewEventEnabled())
                .eventReminderEnabled(setting.isEventReminderEnabled())
                .subscribedCategories(setting.getSubscribedCategories())
                .subscribedRegions(setting.getSubscribedRegions())
                .build();
    }
}
