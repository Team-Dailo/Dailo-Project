package com.dailo.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VersionCheckResponseDto {
    private boolean updateRequired;      // 업데이트 필요 여부
    private boolean forceUpdate;         // 강제 업데이트 여부
    private String latestVersion;        // 최신 버전
    private String updateMessage;        // 업데이트 안내 메시지
    private String storeUrl;             // 스토어 URL
}
