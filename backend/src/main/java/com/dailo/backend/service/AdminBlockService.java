package com.dailo.backend.service;

import com.dailo.backend.dto.admin.HeavyBlockedMemberDto;
import com.dailo.backend.entity.Member;
import com.dailo.backend.repository.BlockRepository;
import com.dailo.backend.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminBlockService {

    private final BlockRepository blockRepository;
    private final MemberRepository memberRepository;

    /** 차단 5회 이상 당한 회원 목록 (회원 정보 + 차단 횟수, 정지 해제일) */
    @Transactional(readOnly = true)
    public List<HeavyBlockedMemberDto> getHeavyBlockedList() {
        List<Object[]> rows = blockRepository.findBlockedIdsWithCountAtLeast5();
        if (rows.isEmpty()) return Collections.emptyList();

        List<Long> memberIds = new ArrayList<>();
        Map<Long, Integer> countByMemberId = new HashMap<>();
        for (Object[] row : rows) {
            Long blockedId = ((Number) row[0]).longValue();
            int cnt = ((Number) row[1]).intValue();
            memberIds.add(blockedId);
            countByMemberId.put(blockedId, cnt);
        }

        List<Member> members = memberRepository.findAllById(memberIds);
        return members.stream()
                .map(m -> HeavyBlockedMemberDto.of(m, countByMemberId.getOrDefault(m.getId(), 0)))
                .collect(Collectors.toList());
    }

    /** 관리자 정지 적용: 2W, 1M, 1Y, PERMANENT, NONE */
    @Transactional
    public void suspend(Long memberId, String type) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("회원을 찾을 수 없습니다."));

        LocalDateTime until = resolveSuspendedUntil(type);
        member.setSuspendedUntil(until);
        memberRepository.save(member);
    }

    private static LocalDateTime resolveSuspendedUntil(String type) {
        if (type == null || type.equalsIgnoreCase("NONE")) return null;
        LocalDateTime now = LocalDateTime.now();
        return switch (type.toUpperCase()) {
            case "2W" -> now.plusWeeks(2);
            case "1M" -> now.plusMonths(1);
            case "1Y" -> now.plusYears(1);
            case "PERMANENT" -> LocalDateTime.of(9999, 12, 31, 23, 59, 59);
            default -> throw new IllegalArgumentException("지원하지 않는 정지 타입: " + type);
        };
    }
}
