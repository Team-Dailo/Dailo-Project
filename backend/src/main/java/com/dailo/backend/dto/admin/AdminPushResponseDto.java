package com.dailo.backend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminPushResponseDto {
    private int totalTargets;
    private int successCount;
    private int failCount;
    private LocalDateTime sentAt;
}
