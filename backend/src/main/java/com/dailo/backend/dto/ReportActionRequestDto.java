package com.dailo.backend.dto;

import com.dailo.backend.domain.enums.ReportAction;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ReportActionRequestDto {

    @NotNull(message = "actionType is required")
    private ReportAction actionType;

    private String reason;
}
