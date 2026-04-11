package com.dailo.backend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class MemberStatsDto {
    private long total;
    private long active;
    private long suspended;
    private long deleted;
    private long todaySignups;
}
