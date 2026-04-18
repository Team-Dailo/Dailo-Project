package com.dailo.backend.service;

import com.dailo.backend.domain.enums.CommentStatus;
import com.dailo.backend.domain.enums.ReportStatus;
import com.dailo.backend.domain.enums.ReportType;
import com.dailo.backend.dto.admin.AdminCommentDto;
import com.dailo.backend.entity.Comment;
import com.dailo.backend.repository.CommentRepository;
import com.dailo.backend.repository.ReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminCommentService {

    private final CommentRepository commentRepository;
    private final ReportRepository reportRepository;

    /**
     * 전체 댓글 목록 조회 (최신순)
     */
    public Page<AdminCommentDto> getComments(Pageable pageable) {
        Page<Comment> comments = commentRepository.findAllByOrderByCreatedAtDesc(pageable);
        return comments.map(AdminCommentDto::from);
    }

    /**
     * 신고된 댓글 목록 조회
     */
    public Page<AdminCommentDto> getReportedComments(Pageable pageable) {
        // 신고된 댓글 ID와 신고 수 조회
        List<Object[]> reportCounts = reportRepository.countByTargetTypeGroupByTargetId(ReportType.COMMENT);

        Map<Long, Long> reportCountMap = reportCounts.stream()
                .collect(Collectors.toMap(
                        row -> (Long) row[0],
                        row -> (Long) row[1]
                ));

        if (reportCountMap.isEmpty()) {
            return Page.empty(pageable);
        }

        // 신고된 댓글 조회
        List<Long> reportedCommentIds = reportCountMap.keySet().stream().toList();
        Page<Comment> comments = commentRepository.findAllByOrderByCreatedAtDesc(pageable);

        return comments
                .map(comment -> {
                    int count = reportCountMap.getOrDefault(comment.getId(), 0L).intValue();
                    return AdminCommentDto.from(comment, count);
                });
    }

    /**
     * 댓글 상세 조회
     */
    public AdminCommentDto getComment(Long commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다. id=" + commentId));

        long reportCount = reportRepository.countByTargetTypeAndTargetId(ReportType.COMMENT, commentId);
        return AdminCommentDto.from(comment, (int) reportCount);
    }

    /**
     * 댓글 숨김 처리
     */
    @Transactional
    public AdminCommentDto hideComment(Long commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다. id=" + commentId));

        comment.hide();
        return AdminCommentDto.from(comment);
    }

    /**
     * 댓글 숨김 해제
     */
    @Transactional
    public AdminCommentDto restoreComment(Long commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다. id=" + commentId));

        comment.restore();
        return AdminCommentDto.from(comment);
    }

    /**
     * 댓글 삭제
     */
    @Transactional
    public void deleteComment(Long commentId) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("댓글을 찾을 수 없습니다. id=" + commentId));

        comment.softDelete();
    }
}
