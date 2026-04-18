package com.dailo.backend.service;

import com.dailo.backend.domain.enums.EventStatus;
import com.dailo.backend.domain.enums.InquiryStatus;
import com.dailo.backend.domain.enums.MemberStatus;
import com.dailo.backend.domain.enums.PostStatus;
import com.dailo.backend.domain.enums.ReportStatus;
import com.dailo.backend.dto.admin.*;
import com.dailo.backend.repository.*;
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
}
