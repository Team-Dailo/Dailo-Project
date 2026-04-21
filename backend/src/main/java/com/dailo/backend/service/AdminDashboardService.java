package com.dailo.backend.service;

import com.dailo.backend.domain.enums.EventStatus;
import com.dailo.backend.domain.enums.InquiryStatus;
import com.dailo.backend.domain.enums.MemberStatus;
import com.dailo.backend.domain.enums.PostStatus;
import com.dailo.backend.domain.enums.ReportStatus;
import com.dailo.backend.dto.admin.*;
import com.dailo.backend.repository.*;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminDashboardService {

    private final MemberRepository memberRepository;
    private final EventRepository eventRepository;
    private final PostRepository postRepository;
    private final ReportRepository reportRepository;
    private final InquiryRepository inquiryRepository;
    private final ClickLogRepository clickLogRepository;

    public DashboardResponseDto getDashboardStats() {
        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();

        MemberStatsDto memberStats = MemberStatsDto.builder()
                .total(memberRepository.count())
                .active(memberRepository.countByStatus(MemberStatus.ACTIVE))
                .suspended(memberRepository.countByStatus(MemberStatus.SUSPENDED))
                .deleted(memberRepository.countByStatus(MemberStatus.DELETED))
                .todaySignups(memberRepository.countByCreatedAtAfter(startOfToday))
                .build();

        EventStatsDto eventStats = EventStatsDto.builder()
                .total(eventRepository.count())
                .active(eventRepository.countByStatus(EventStatus.ACTIVE))
                .draft(eventRepository.countByStatus(EventStatus.DRAFT))
                .ended(eventRepository.countByStatus(EventStatus.ENDED))
                .inactive(eventRepository.countByStatus(EventStatus.INACTIVE))
                .build();

        PostStatsDto postStats = PostStatsDto.builder()
                .total(postRepository.count())
                .published(postRepository.countByStatus(PostStatus.PUBLISHED))
                .hidden(postRepository.countByStatus(PostStatus.HIDDEN))
                .todayPosts(postRepository.countByCreatedAtAfter(startOfToday))
                .build();

        ReportStatsDto reportStats = ReportStatsDto.builder()
                .total(reportRepository.count())
                .pending(reportRepository.countByStatus(ReportStatus.PENDING))
                .resolved(reportRepository.countByStatus(ReportStatus.RESOLVED))
                .dismissed(reportRepository.countByStatus(ReportStatus.DISMISSED))
                .build();

        InquiryStatsDto inquiryStats = InquiryStatsDto.builder()
                .total(inquiryRepository.count())
                .pending(inquiryRepository.countByStatus(InquiryStatus.PENDING))
                .answered(inquiryRepository.countByStatus(InquiryStatus.ANSWERED))
                .build();

        return DashboardResponseDto.builder()
                .memberStats(memberStats)
                .eventStats(eventStats)
                .postStats(postStats)
                .reportStats(reportStats)
                .inquiryStats(inquiryStats)
                .generatedAt(LocalDateTime.now())
                .build();
    }

    /**
     * 일일 시간대별 사용자 활동 통계
     */
    public DailyActivityStatsDto getDailyActivityStats(LocalDate date) {
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.atTime(LocalTime.MAX);

        List<Object[]> hourlyData = clickLogRepository.findHourlyClickCounts(start, end);

        // 시간대별 데이터를 맵으로 변환
        Map<Integer, Long> hourMap = hourlyData.stream()
                .collect(Collectors.toMap(
                        row -> ((Number) row[0]).intValue(),
                        row -> ((Number) row[1]).longValue()
                ));

        // 0-23시 전체 리스트 생성 (데이터 없으면 0)
        List<DailyActivityStatsDto.HourlyCount> hourlyCounts = new ArrayList<>();
        long totalClicks = 0;
        for (int hour = 0; hour < 24; hour++) {
            long count = hourMap.getOrDefault(hour, 0L);
            hourlyCounts.add(new DailyActivityStatsDto.HourlyCount(hour, count));
            totalClicks += count;
        }

        return DailyActivityStatsDto.builder()
                .date(date)
                .totalClicks((int) totalClicks)
                .hourlyCounts(hourlyCounts)
                .build();
    }
}
