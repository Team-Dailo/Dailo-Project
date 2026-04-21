package com.dailo.backend.service;

import com.dailo.backend.dto.IngestLogResponseDto;
import com.dailo.backend.entity.IngestLog;
import com.dailo.backend.exception.ForbiddenException;
import com.dailo.backend.exception.NotFoundException;
import com.dailo.backend.repository.IngestLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminIngestLogService {

    private final IngestLogRepository ingestLogRepository;

    // MVP: 하드코딩 관리자 ID (AdminReportService와 동일 패턴)
    private static final Set<Long> ADMIN_IDS = Set.of(1L, 2L, 14L);

    private void validateAdminRole(Long userId) {
        if (!ADMIN_IDS.contains(userId)) {
            throw new ForbiddenException("Admin access required");
        }
    }

    // 수집 로그 목록 조회
    public Page<IngestLogResponseDto> getIngestLogs(Long adminId, String source, Pageable pageable) {
        validateAdminRole(adminId);

        if (source != null && !source.isEmpty()) {
            return ingestLogRepository.findBySource(source, pageable)
                    .map(IngestLogResponseDto::from);
        }
        return ingestLogRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(IngestLogResponseDto::from);
    }

    // 수집 로그 상세 조회
    public IngestLogResponseDto getIngestLog(Long adminId, Long logId) {
        validateAdminRole(adminId);

        IngestLog log = ingestLogRepository.findById(logId)
                .orElseThrow(() -> new NotFoundException("Ingest log not found: " + logId));

        return IngestLogResponseDto.from(log);
    }
}
