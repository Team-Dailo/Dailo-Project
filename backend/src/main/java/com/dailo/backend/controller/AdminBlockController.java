package com.dailo.backend.controller;

import com.dailo.backend.domain.enums.Role;
import com.dailo.backend.dto.admin.HeavyBlockedMemberDto;
import com.dailo.backend.entity.Member;
import com.dailo.backend.repository.MemberRepository;
import com.dailo.backend.service.AdminBlockService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/blocks")
@RequiredArgsConstructor
public class AdminBlockController {

    private final MemberRepository memberRepository;
    private final AdminBlockService adminBlockService;

    @Value("${app.admin.emails:}")
    private String adminEmailsProperty;

    @Value("${app.admin.user-ids:}")
    private String adminUserIdsProperty;

    /** 5회 이상 차단당한 회원 목록 (관리자 전용) */
    @GetMapping("/heavy-blocked")
    public ResponseEntity<List<HeavyBlockedMemberDto>> getHeavyBlockedList(
            @AuthenticationPrincipal UserDetails userDetails) {
        Long memberId = Long.parseLong(userDetails.getUsername());
        Member current = memberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("회원 정보가 없습니다."));

        if (current.getRole() != Role.ADMIN && !isInAdminEmails(current.getEmail()) && !isInAdminUserIds(memberId)) {
            return ResponseEntity.status(403).build();
        }

        return ResponseEntity.ok(adminBlockService.getHeavyBlockedList());
    }

    private boolean isInAdminEmails(String email) {
        if (adminEmailsProperty == null || adminEmailsProperty.isBlank() || email == null) return false;
        Set<String> emails = Arrays.stream(adminEmailsProperty.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());
        return emails.contains(email.trim());
    }

    private boolean isInAdminUserIds(Long memberId) {
        if (adminUserIdsProperty == null || adminUserIdsProperty.isBlank() || memberId == null) return false;
        List<Long> ids = Arrays.stream(adminUserIdsProperty.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> {
                    try { return Long.parseLong(s); } catch (NumberFormatException e) { return null; }
                })
                .filter(id -> id != null)
                .collect(Collectors.toList());
        return ids.contains(memberId);
    }
}
