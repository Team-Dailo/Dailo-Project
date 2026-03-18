package com.dailo.backend.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class NotificationSettingRequestDto {
    private boolean newEventEnabled = true;
    private boolean eventReminderEnabled = true;
    private String subscribedCategories;
    private String subscribedRegions;
}
