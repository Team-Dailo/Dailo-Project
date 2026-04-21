package com.dailo.backend.config;

import com.dailo.backend.domain.enums.Role;
import com.dailo.backend.entity.Member;
import com.dailo.backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 서버 시작 시 관리자 계정이 없으면 자동 생성
 */
@Slf4j
@Order(10)
@Component
@RequiredArgsConstructor
public class AdminSeedRunner implements ApplicationRunner {

    private static final String ADMIN_EMAIL = "admin@dailo.com";
    private static final String ADMIN_PASSWORD = "admin123";
    private static final String ADMIN_NICKNAME = "관리자";

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (memberRepository.findByEmail(ADMIN_EMAIL).isEmpty()) {
            Member admin = Member.builder()
                    .email(ADMIN_EMAIL)
                    .password(passwordEncoder.encode(ADMIN_PASSWORD))
                    .nickname(ADMIN_NICKNAME)
                    .role(Role.ADMIN)
                    .build();
            memberRepository.save(admin);
            log.info("관리자 계정 생성 완료: {}", ADMIN_EMAIL);
        } else {
            log.info("관리자 계정 이미 존재: {}", ADMIN_EMAIL);
        }
    }
}
