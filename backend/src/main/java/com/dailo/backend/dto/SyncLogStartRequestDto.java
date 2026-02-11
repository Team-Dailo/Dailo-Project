package com.dailo.backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SyncLogStartRequestDto {

    @NotBlank(message = "sourceType is required")
    private String sourceType;
}
