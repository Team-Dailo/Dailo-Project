package com.dailo.backend.config;

import com.dailo.backend.domain.enums.Role;
import com.dailo.backend.entity.Member;
import com.dailo.backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * application.properties 의 app.admin.emails / app.admin.user-ids 에 지정된 회원을
 * 앱 기동 시 role=ADMIN 으로 설정합니다.
 * - app.admin.emails=yunajo5858@gmail.com (쉼표 구분 가능)
 * - app.admin.user-ids=1,2,3
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminInitializer implements ApplicationRunner {

    private final MemberRepository memberRepository;

    @Value("${app.admin.emails:}")
    private String adminEmailsProperty;

    @Value("${app.admin.user-ids:}")
    private String adminUserIdsProperty;

    @Override
    public void run(ApplicationArguments args) {
        // 이메일로 지정된 관리자
        if (adminEmailsProperty != null && !adminEmailsProperty.isBlank()) {
            List<String> emails = Arrays.stream(adminEmailsProperty.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toList());
            for (String email : emails) {
                memberRepository.findByEmail(email).ifPresent(member -> {
                    if (member.getRole() != Role.ADMIN) {
                        member.setRole(Role.ADMIN);
                        memberRepository.save(member);
                        log.info("Admin role assigned to member email={}, id={}", email, member.getId());
                    }
                });
            }
        }

        // ID로 지정된 관리자
        if (adminUserIdsProperty == null || adminUserIdsProperty.isBlank()) {
            return;
        }
        List<Long> ids = Arrays.stream(adminUserIdsProperty.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> {
                    try {
                        return Long.parseLong(s);
                    } catch (NumberFormatException e) {
                        log.warn("Invalid admin user id in app.admin.user-ids: {}", s);
                        return null;
                    }
                })
                .filter(id -> id != null)
                .collect(Collectors.toList());
        if (ids.isEmpty()) return;

        for (Long id : ids) {
            memberRepository.findById(id).ifPresent(member -> {
                if (member.getRole() != Role.ADMIN) {
                    member.setRole(Role.ADMIN);
                    memberRepository.save(member);
                    log.info("Admin role assigned to member id={}, email={}", id, member.getEmail());
                }
            });
        }
    }
}
