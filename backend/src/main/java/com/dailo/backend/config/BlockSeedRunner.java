package com.dailo.backend.config;

import com.dailo.backend.domain.enums.Role;
import com.dailo.backend.entity.Block;
import com.dailo.backend.entity.Member;
import com.dailo.backend.repository.BlockRepository;
import com.dailo.backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * cc@gmail.com 계정이 "차단 5회 당한" 상태가 되도록 blocks 테이블에 시드 데이터를 넣습니다.
 * (관리자 차단관리 등에서 5회 이상 차단 당한 회원 목록에 노출되도록)
 */
@Slf4j
@Order(50)
@Component
@RequiredArgsConstructor
public class BlockSeedRunner implements ApplicationRunner {

    private static final String TARGET_EMAIL = "cc@gmail.com";
    private static final int BLOCK_COUNT_TARGET = 5;

    private final MemberRepository memberRepository;
    private final BlockRepository blockRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        try {
            Member target = memberRepository.findByEmail(TARGET_EMAIL)
                    .orElseGet(() -> {
                        Member m = Member.builder()
                                .email(TARGET_EMAIL)
                                .password(passwordEncoder.encode("password1!"))
                                .nickname("cc")
                                .role(Role.USER)
                                .build();
                        return memberRepository.save(m);
                    });

            long blockedId = target.getId();
            // 이미 나(cc@gmail.com)를 차단한 사람 ID 목록
            List<Long> blockerIds = new ArrayList<>(blockRepository.findIdsWhoBlockedUser(blockedId));

            if (blockerIds.size() < BLOCK_COUNT_TARGET) {
                List<Long> otherMemberIds = memberRepository.findAll().stream()
                        .map(Member::getId)
                        .filter(id -> !id.equals(blockedId) && !blockerIds.contains(id))
                        .collect(Collectors.toList());

                for (Long id : otherMemberIds) {
                    if (blockerIds.size() >= BLOCK_COUNT_TARGET) break;
                    if (!blockRepository.existsByBlockerIdAndBlockedId(id, blockedId)) {
                        blockerIds.add(id);
                    }
                }
            }

            while (blockerIds.size() < BLOCK_COUNT_TARGET) {
                String email = "blocker-seed-" + (blockerIds.size() + 1) + "@dummy.local";
                if (memberRepository.findByEmail(email).isPresent()) continue;
                Member blocker = Member.builder()
                        .email(email)
                        .password(passwordEncoder.encode("seed1!"))
                        .nickname("차단자" + (blockerIds.size() + 1))
                        .role(Role.USER)
                        .build();
                blocker = memberRepository.save(blocker);
                blockerIds.add(blocker.getId());
            }

            int added = 0;
            for (Long blockerId : blockerIds) {
                if (blockRepository.existsByBlockerIdAndBlockedId(blockerId, blockedId)) continue;
                blockRepository.save(Block.builder()
                        .blockerId(blockerId)
                        .blockedId(blockedId)
                        .build());
                added++;
            }

            if (added > 0) {
                log.info("Block seed: {} has been blocked {} time(s) (total: {} blockers)",
                        TARGET_EMAIL, added, blockRepository.findIdsWhoBlockedUser(blockedId).size());
            }
        } catch (Exception e) {
            log.warn("Block seed for {} failed (ignored): {}", TARGET_EMAIL, e.getMessage());
        }
    }
}
