package com.dailo.backend.service;

import com.dailo.backend.domain.enums.SyncStatus;
import com.dailo.backend.dto.SyncLogCompleteRequestDto;
import com.dailo.backend.dto.SyncLogResponseDto;
import com.dailo.backend.dto.SyncLogStartRequestDto;
import com.dailo.backend.entity.SyncLog;
import com.dailo.backend.exception.ConflictException;
import com.dailo.backend.exception.ForbiddenException;
import com.dailo.backend.exception.NotFoundException;
import com.dailo.backend.repository.SyncLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SyncLogService {

    private final SyncLogRepository syncLogRepository;

    // TODO: User Entity 구현 후 DB 조회로 변경
    private static final Set<Long> ADMIN_IDS = Set.of(1L, 2L, 14L);

    private void validateAdminRole(Long userId) {
        if (!ADMIN_IDS.contains(userId)) {
            throw new ForbiddenException("Admin access required");
        }
    }

    // 동기화 로그 목록 조회 (필터링)
    public Page<SyncLogResponseDto> getLogs(Long adminId, String sourceType, SyncStatus status, Pageable pageable) {
        validateAdminRole(adminId);

        Page<SyncLog> logs;

        if (sourceType != null && status != null) {
            logs = syncLogRepository.findBySourceTypeAndStatus(sourceType, status, pageable);
        } else if (sourceType != null) {
            logs = syncLogRepository.findBySourceType(sourceType, pageable);
        } else if (status != null) {
            logs = syncLogRepository.findByStatus(status, pageable);
        } else {
            logs = syncLogRepository.findAll(pageable);
        }

        return logs.map(SyncLogResponseDto::from);
    }

    // 동기화 로그 상세 조회
    public SyncLogResponseDto getLog(Long adminId, Long logId) {
        validateAdminRole(adminId);

        SyncLog log = syncLogRepository.findById(logId)
                .orElseThrow(() -> new NotFoundException("SyncLog not found: " + logId));

        return SyncLogResponseDto.from(log);
    }

    // 동기화 시작 기록
    @Transactional
    public SyncLogResponseDto startSync(Long adminId, SyncLogStartRequestDto requestDto) {
        validateAdminRole(adminId);

        SyncLog log = SyncLog.builder()
                .sourceType(requestDto.getSourceType())
                .build();

        SyncLog savedLog = syncLogRepository.save(log);

        return SyncLogResponseDto.from(savedLog);
    }

    // 동기화 완료 기록
    @Transactional
    public SyncLogResponseDto completeSync(Long adminId, Long logId, SyncLogCompleteRequestDto requestDto) {
        validateAdminRole(adminId);

        SyncLog log = syncLogRepository.findById(logId)
                .orElseThrow(() -> new NotFoundException("SyncLog not found: " + logId));

        // 이미 완료된 로그인지 확인
        if (log.getStatus() != SyncStatus.STARTED) {
            throw new ConflictException("SyncLog already completed");
        }

        if (requestDto.isSuccess()) {
            log.completeAsSuccess(
                    requestDto.getTotalCount() != null ? requestDto.getTotalCount() : 0,
                    requestDto.getSuccessCount() != null ? requestDto.getSuccessCount() : 0,
                    requestDto.getFailCount() != null ? requestDto.getFailCount() : 0
            );
        } else {
            if (requestDto.getTotalCount() != null && requestDto.getTotalCount() > 0) {
                log.completeWithPartialSuccess(
                        requestDto.getTotalCount(),
                        requestDto.getSuccessCount() != null ? requestDto.getSuccessCount() : 0,
                        requestDto.getFailCount() != null ? requestDto.getFailCount() : 0,
                        requestDto.getErrorMessage()
                );
            } else {
                log.completeAsFailed(requestDto.getErrorMessage());
            }
        }

        return SyncLogResponseDto.from(log);
    }
}
