package com.dailo.backend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DashboardResponseDto {
    private MemberStatsDto memberStats;
    private EventStatsDto eventStats;
    private PostStatsDto postStats;
    private CommentStatsDto commentStats;
    private ReportStatsDto reportStats;
    private InquiryStatsDto inquiryStats;
    private LocalDateTime generatedAt;
}
