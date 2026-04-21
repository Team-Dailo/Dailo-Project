package com.dailo.backend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class DailyActivityStatsDto {
    private LocalDate date;
    private Integer totalClicks;
    private List<HourlyCount> hourlyCounts;

    @Data
    @AllArgsConstructor
    public static class HourlyCount {
        private Integer hour;  // 0-23
        private Long count;
    }
}
