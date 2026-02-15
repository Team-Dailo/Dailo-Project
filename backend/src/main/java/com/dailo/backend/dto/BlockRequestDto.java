package com.dailo.backend.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
@AllArgsConstructor
public class BlockRequestDto {

    @NotNull(message = "blockedId is required")
    @Positive(message = "blockedId must be positive")
    private Long blockedId;
}
