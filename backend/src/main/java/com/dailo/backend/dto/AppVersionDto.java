package com.dailo.backend.dto;

import com.dailo.backend.entity.AppVersion;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppVersionDto {
    private Long id;
    private String platform;
    private String minimumVersion;
    private String latestVersion;
    private Boolean forceUpdate;
    private String updateMessage;
    private String storeUrl;
    private LocalDateTime updatedAt;

    public static AppVersionDto from(AppVersion entity) {
        return AppVersionDto.builder()
                .id(entity.getId())
                .platform(entity.getPlatform())
                .minimumVersion(entity.getMinimumVersion())
                .latestVersion(entity.getLatestVersion())
                .forceUpdate(entity.getForceUpdate())
                .updateMessage(entity.getUpdateMessage())
                .storeUrl(entity.getStoreUrl())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
