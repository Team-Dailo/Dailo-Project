package com.dailo.backend.service;

import com.dailo.backend.domain.enums.ReportType;
import com.dailo.backend.dto.ReportRequestDto;
import com.dailo.backend.dto.ReportResponseDto;
import com.dailo.backend.entity.Comment;
import com.dailo.backend.entity.Post;
import com.dailo.backend.entity.Report;
import com.dailo.backend.repository.CommentRepository;
import com.dailo.backend.repository.PostRepository;
import com.dailo.backend.repository.ReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

    private final ReportRepository reportRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;

    // 신고 생성
    @Transactional
    public ReportResponseDto createReport(ReportRequestDto requestDto, Long reporterId) {
        // 1. 대상 존재 검증 + 자기 신고 방지
        validateTarget(requestDto.getTargetType(), requestDto.getTargetId(), reporterId);

        // 2. 중복 신고 체크
        if (reportRepository.existsByReporterIdAndTargetTypeAndTargetId(
                reporterId, requestDto.getTargetType(), requestDto.getTargetId())) {
            throw new RuntimeException("Already reported");
        }

        Report report = requestDto.toEntity(reporterId);
        Report savedReport = reportRepository.save(report);

        return ReportResponseDto.from(savedReport);
    }

    private void validateTarget(ReportType targetType, Long targetId, Long reporterId) {
        switch (targetType) {
            case POST -> {
                Post post = postRepository.findById(targetId)
                        .orElseThrow(() -> new RuntimeException("Post not found: " + targetId));
                if (post.getAuthorId().equals(reporterId)) {
                    throw new RuntimeException("Cannot report your own post");
                }
            }
            case COMMENT -> {
                Comment comment = commentRepository.findById(targetId)
                        .orElseThrow(() -> new RuntimeException("Comment not found: " + targetId));
                if (comment.getAuthorId().equals(reporterId)) {
                    throw new RuntimeException("Cannot report your own comment");
                }
            }
            case USER -> {
                if (targetId.equals(reporterId)) {
                    throw new RuntimeException("Cannot report yourself");
                }
                // TODO: UserRepository.existsById(targetId) 검증 추가
            }
            case CHAT -> {
                // TODO: ChatMessage/ChatRoom 검증 추가
            }
        }
    }

    // 내 신고 목록
    public Page<ReportResponseDto> getMyReports(Long reporterId, Pageable pageable) {
        return reportRepository.findByReporterId(reporterId, pageable)
                .map(ReportResponseDto::from);
    }
}
