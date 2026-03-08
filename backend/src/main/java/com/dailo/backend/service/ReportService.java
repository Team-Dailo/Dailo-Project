package com.dailo.backend.service;

import com.dailo.backend.domain.enums.ReportType;
import com.dailo.backend.dto.ReportRequestDto;
import com.dailo.backend.dto.ReportResponseDto;
import com.dailo.backend.entity.Comment;
import com.dailo.backend.entity.Member;
import com.dailo.backend.entity.Post;
import com.dailo.backend.entity.Report;
import com.dailo.backend.exception.ConflictException;
import com.dailo.backend.exception.NotFoundException;
import com.dailo.backend.exception.UnauthorizedException;
import com.dailo.backend.repository.CommentRepository;
import com.dailo.backend.repository.MemberRepository;
import com.dailo.backend.repository.PostRepository;
import com.dailo.backend.repository.ReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
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
    private final MemberRepository memberRepository;

    // --- 외부(Controller) 호출용 이메일 기반 메서드 ---

    /** 신고 생성 (이메일 기반) */
    @Transactional
    public ReportResponseDto createReportByEmail(ReportRequestDto requestDto, String email) {
        if (email == null) {
            throw new UnauthorizedException("로그인이 필요합니다.");
        }
        Member reporter = memberRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("사용자를 찾을 수 없습니다."));
        return createReport(requestDto, reporter.getId());
    }

    /** 내 신고 목록 (이메일 기반) */
    public Page<ReportResponseDto> getMyReportsByEmail(String email, Pageable pageable) {
        if (email == null) {
            throw new UnauthorizedException("로그인이 필요합니다.");
        }
        Member reporter = memberRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("사용자를 찾을 수 없습니다."));
        return getMyReports(reporter.getId(), pageable);
    }

    // --- 내부 로직 및 기존 ID 기반 메서드 ---

    @Transactional
    public ReportResponseDto createReport(ReportRequestDto requestDto, Long reporterId) {
        // 1. 대상 존재 검증 + 자기 신고 방지
        validateTarget(requestDto.getTargetType(), requestDto.getTargetId(), reporterId);

        // 2. 중복 신고 체크
        if (reportRepository.existsByReporterIdAndTargetTypeAndTargetId(
                reporterId, requestDto.getTargetType(), requestDto.getTargetId())) {
            throw new ConflictException("이미 신고한 대상입니다.");
        }

        Report report = requestDto.toEntity(reporterId);
        Report savedReport = reportRepository.save(report);

        // 게시글 신고 10건 이상 시 자동 삭제(소프트 삭제)
        if (savedReport.getTargetType() == ReportType.POST) {
            long count = reportRepository.countByTargetTypeAndTargetId(ReportType.POST, savedReport.getTargetId());
            if (count >= 10) {
                postRepository.deleteById(savedReport.getTargetId());
            }
        }

        return ReportResponseDto.from(savedReport);
    }

    private void validateTarget(ReportType targetType, Long targetId, Long reporterId) {
        switch (targetType) {
            case POST -> {
                Post post = postRepository.findById(targetId)
                        .orElseThrow(() -> new NotFoundException("게시글을 찾을 수 없습니다: " + targetId));
                if (post.getAuthorId().equals(reporterId)) {
                    throw new IllegalArgumentException("자신의 게시글은 신고할 수 없습니다.");
                }
            }
            case COMMENT -> {
                Comment comment = commentRepository.findById(targetId)
                        .orElseThrow(() -> new NotFoundException("댓글을 찾을 수 없습니다: " + targetId));
                if (comment.getAuthorId().equals(reporterId)) {
                    throw new IllegalArgumentException("자신의 댓글은 신고할 수 없습니다.");
                }
            }
            case USER -> {
                if (targetId.equals(reporterId)) {
                    throw new IllegalArgumentException("자기 자신은 신고할 수 없습니다.");
                }
            }
            case CHAT -> {
                // TODO: ChatMessage/ChatRoom 검증 추가
            }
        }
    }

    public Page<ReportResponseDto> getMyReports(Long reporterId, Pageable pageable) {
        Page<Report> page = reportRepository.findByReporterId(reporterId, pageable);
        java.util.List<ReportResponseDto> dtos = enrichWithTargetDisplay(page.getContent());
        return new PageImpl<>(dtos, page.getPageable(), page.getTotalElements());
    }

    private java.util.List<ReportResponseDto> enrichWithTargetDisplay(java.util.List<Report> reports) {
        if (reports.isEmpty()) return java.util.List.of();
        java.util.List<Long> postIds = reports.stream()
                .filter(r -> r.getTargetType() == ReportType.POST)
                .map(Report::getTargetId)
                .distinct()
                .toList();
        java.util.List<Long> commentIds = reports.stream()
                .filter(r -> r.getTargetType() == ReportType.COMMENT)
                .map(Report::getTargetId)
                .distinct()
                .toList();
        java.util.Map<Long, String> postDisplay = postRepository.findAllById(postIds).stream()
                .collect(java.util.stream.Collectors.toMap(Post::getId, p -> {
                    String title = p.getTitle() != null ? p.getTitle().trim() : "";
                    String content = p.getContent() != null ? p.getContent().trim() : "";
                    if (content.isEmpty()) return title.isEmpty() ? "제목 없음" : title;
                    String contentPreview = content.length() > 50 ? content.substring(0, 50) + "…" : content;
                    return title.isEmpty() ? contentPreview : title + " - " + contentPreview;
                }, (a, b) -> a));
        java.util.Map<Long, String> commentDisplay = commentRepository.findAllById(commentIds).stream()
                .collect(java.util.stream.Collectors.toMap(Comment::getId, c -> truncate(c.getContent(), 50), (a, b) -> a));
        return reports.stream()
                .map(r -> {
                    String display = switch (r.getTargetType()) {
                        case POST -> postDisplay.getOrDefault(r.getTargetId(), "삭제된 게시물");
                        case COMMENT -> commentDisplay.getOrDefault(r.getTargetId(), "삭제된 댓글");
                        case USER -> "사용자";
                        case CHAT -> "채팅";
                    };
                    return ReportResponseDto.from(r, display);
                })
                .toList();
    }

    private static String truncate(String s, int maxLen) {
        if (s == null) return "";
        if (s.length() <= maxLen) return s;
        return s.substring(0, maxLen) + "…";
    }
}
