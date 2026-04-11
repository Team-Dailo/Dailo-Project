package com.dailo.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class AppVersionRequestDto {

    @NotBlank(message = "플랫폼을 입력해주세요.")
    private String platform;  // IOS, ANDROID

    @NotBlank(message = "최소 버전을 입력해주세요.")
    private String minimumVersion;

    @NotBlank(message = "최신 버전을 입력해주세요.")
    private String latestVersion;

    private Boolean forceUpdate;
    private String updateMessage;
    private String storeUrl;
}
