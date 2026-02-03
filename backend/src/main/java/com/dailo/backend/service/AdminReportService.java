package com.dailo.backend.service;

import com.dailo.backend.domain.enums.ReportAction;
import com.dailo.backend.domain.enums.ReportStatus;
import com.dailo.backend.domain.enums.ReportType;
import com.dailo.backend.dto.AdminReportDetailResponseDto;
import com.dailo.backend.dto.ReportActionRequestDto;
import com.dailo.backend.dto.ReportActionResponseDto;
import com.dailo.backend.dto.ReportResponseDto;
import com.dailo.backend.entity.Report;
import com.dailo.backend.entity.ReportActionEntity;
import com.dailo.backend.exception.ConflictException;
import com.dailo.backend.exception.ForbiddenException;
import com.dailo.backend.exception.NotFoundException;
import com.dailo.backend.repository.ReportActionRepository;
import com.dailo.backend.repository.ReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminReportService {

    private final ReportRepository reportRepository;
    private final ReportActionRepository reportActionRepository;

    // TODO: User Entity 구현 후 DB 조회로 변경
    // MVP용 임시 Admin ID 목록
    private static final Set<Long> ADMIN_IDS = Set.of(1L, 2L);

    // Admin 권한 검증
    private void validateAdminRole(Long userId) {
        if (!ADMIN_IDS.contains(userId)) {
            throw new ForbiddenException("Admin access required");
        }
    }

    // 신고 목록 조회 (필터링)
    public Page<ReportResponseDto> getReports(Long adminId, ReportStatus status, ReportType targetType, Pageable pageable) {
        validateAdminRole(adminId);

        Page<Report> reports;

        if (status != null && targetType != null) {
            reports = reportRepository.findByStatusAndTargetType(status, targetType, pageable);
        } else if (status != null) {
            reports = reportRepository.findByStatus(status, pageable);
        } else if (targetType != null) {
            reports = reportRepository.findByTargetType(targetType, pageable);
        } else {
            reports = reportRepository.findAll(pageable);
        }

        return reports.map(ReportResponseDto::from);
    }

    // 신고 상세 조회 (처리 이력 포함)
    public AdminReportDetailResponseDto getReportDetail(Long adminId, Long reportId) {
        validateAdminRole(adminId);

        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new NotFoundException("Report not found: " + reportId));

        List<ReportActionEntity> actions = reportActionRepository.findByReportOrderByCreatedAtDesc(report);

        return AdminReportDetailResponseDto.from(report, actions);
    }

    // 신고 처리
    @Transactional
    public ReportActionResponseDto processReport(Long reportId, Long adminId, ReportActionRequestDto requestDto) {
        validateAdminRole(adminId);

        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new NotFoundException("Report not found: " + reportId));

        // 이미 처리된 신고인지 확인
        if (report.getStatus() != ReportStatus.PENDING) {
            throw new ConflictException("Report already processed");
        }

        // 액션별 처리 수행
        executeAction(report, requestDto.getActionType());

        // 처리 이력 저장
        ReportActionEntity action = ReportActionEntity.builder()
                .report(report)
                .adminId(adminId)
                .actionType(requestDto.getActionType())
                .reason(requestDto.getReason())
                .build();

        ReportActionEntity savedAction = reportActionRepository.save(action);

        return ReportActionResponseDto.from(savedAction);
    }

    // 액션별 처리 로직 (확장 포인트)
    private void executeAction(Report report, ReportAction actionType) {
        switch (actionType) {
            case DISMISS -> {
                report.resolveAsDismissed();
            }
            case HIDE -> {
                // TODO: 콘텐츠 숨김 처리 (PostService.hide(), CommentService.hide() 등)
                report.resolveAsResolved();
            }
            case BLIND -> {
                // TODO: 콘텐츠 블라인드 처리
                report.resolveAsResolved();
            }
            case WARN -> {
                // TODO: 사용자 경고 처리 (UserService.warn() 등)
                report.resolveAsResolved();
            }
            case SUSPEND -> {
                // TODO: 사용자 정지 처리 (UserService.suspend() 등)
                report.resolveAsResolved();
            }
        }
    }
}
