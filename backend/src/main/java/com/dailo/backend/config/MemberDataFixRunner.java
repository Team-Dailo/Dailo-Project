package com.dailo.backend.config;

import com.dailo.backend.service.MemberService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * 앱 기동 시 회원 id=1 닉네임이 비어 있으면 "회원1"로 보정합니다.
 * 예전 테스트용 댓글(author_id=1)이 닉네임 없이 user_1로 보이는 문제를 방지합니다.
 */
@Slf4j
@Order(100)
@Component
@RequiredArgsConstructor
public class MemberDataFixRunner implements ApplicationRunner {

    private final MemberService memberService;

    @Override
    public void run(ApplicationArguments args) {
        try {
            memberService.ensureMember1Nickname();
        } catch (Exception e) {
            log.warn("회원 id=1 닉네임 보정 실패 (무시 가능): {}", e.getMessage());
        }
    }
}
