package com.dailo.backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class PushTokenRequest {

    @Schema(description = "FCM 토큰 값", example = "fcm_token_example_123...")
    private String token;

    @Schema(description = "기기 종류", example = "ANDROID")
    private String deviceType;
}