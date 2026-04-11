package com.dailo.backend.service;

import com.dailo.backend.dto.admin.AdminLogDto;
import com.dailo.backend.entity.AdminLog;
import com.dailo.backend.entity.Member;
import com.dailo.backend.repository.AdminLogRepository;
import com.dailo.backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminLogService {

    private final AdminLogRepository adminLogRepository;
    private final MemberRepository memberRepository;

    /**
     * 관리자 활동 로그 기록
     */
    @Transactional
    public void log(Long adminId, String action, String targetType, Long targetId, String description, String ipAddress) {
        Member admin = memberRepository.findById(adminId).orElse(null);
        String adminEmail = admin != null ? admin.getEmail() : "unknown";

        AdminLog log = AdminLog.builder()
                .adminId(adminId)
                .adminEmail(adminEmail)
                .action(action)
                .targetType(targetType)
                .targetId(targetId)
                .description(description)
                .ipAddress(ipAddress)
                .build();

        adminLogRepository.save(log);
    }

    /**
     * 간편 로그 기록 (IP 없이)
     */
    @Transactional
    public void log(Long adminId, String action, String targetType, Long targetId, String description) {
        log(adminId, action, targetType, targetId, description, null);
    }

    /**
     * 전체 로그 조회
     */
    public Page<AdminLogDto> getLogs(Pageable pageable) {
        return adminLogRepository.findAllByOrderByCreatedAtDesc(pageable)
                .map(AdminLogDto::from);
    }

    /**
     * 특정 관리자의 로그 조회
     */
    public Page<AdminLogDto> getLogsByAdmin(Long adminId, Pageable pageable) {
        return adminLogRepository.findByAdminIdOrderByCreatedAtDesc(adminId, pageable)
                .map(AdminLogDto::from);
    }

    /**
     * 특정 액션 타입의 로그 조회
     */
    public Page<AdminLogDto> getLogsByAction(String action, Pageable pageable) {
        return adminLogRepository.findByActionOrderByCreatedAtDesc(action, pageable)
                .map(AdminLogDto::from);
    }

    /**
     * 특정 대상 타입의 로그 조회
     */
    public Page<AdminLogDto> getLogsByTargetType(String targetType, Pageable pageable) {
        return adminLogRepository.findByTargetTypeOrderByCreatedAtDesc(targetType, pageable)
                .map(AdminLogDto::from);
    }
}
