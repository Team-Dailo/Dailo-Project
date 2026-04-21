package com.dailo.backend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class EventActivityStatsDto {
    private Long eventId;
    private String eventTitle;
    private LocalDate date;
    private List<HourlyCount> hourlyCounts;
    private Integer totalViews;

    @Data
    @AllArgsConstructor
    public static class HourlyCount {
        private Integer hour;  // 0-23
        private Long count;
    }
}
