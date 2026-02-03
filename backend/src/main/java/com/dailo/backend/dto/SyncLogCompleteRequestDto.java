package com.dailo.backend.dto;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class SyncLogCompleteRequestDto {

    private boolean success;
    private Integer totalCount;
    private Integer successCount;
    private Integer failCount;
    private String errorMessage;
}
