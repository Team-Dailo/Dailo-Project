package com.dailo.backend.controller;

import com.dailo.backend.domain.enums.Role;
import com.dailo.backend.dto.admin.AdminMemberListItemDto;
import com.dailo.backend.dto.admin.SuspendRequestDto;
import com.dailo.backend.domain.enums.MemberStatus;
import com.dailo.backend.entity.Member;
import com.dailo.backend.repository.MemberRepository;
import com.dailo.backend.service.AdminBlockService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/members")
@RequiredArgsConstructor
public class AdminMemberController {

    private final MemberRepository memberRepository;
    private final AdminBlockService adminBlockService;

    @Value("${app.admin.emails:}")
    private String adminEmailsProperty;

    @Value("${app.admin.user-ids:}")
    private String adminUserIdsProperty;

    /** 관리자용 회원 목록 (DB role=ADMIN 이거나 app.admin.emails / app.admin.user-ids 에 있으면 허용) */
    @GetMapping
    public ResponseEntity<Page<AdminMemberListItemDto>> getMemberList(
            @AuthenticationPrincipal UserDetails userDetails,
            @PageableDefault(size = 50, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        Long memberId = Long.parseLong(userDetails.getUsername());
        Member current = memberRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("회원 정보가 없습니다."));

        if (current.getRole() == Role.ADMIN) {
            // 이미 ADMIN
        } else if (isInAdminEmails(current.getEmail())) {
            // 설정에 이메일로 등록된 관리자 → 허용 (다음 접근부터는 role 갱신 권장)
        } else if (isInAdminUserIds(memberId)) {
            // 설정에 ID로 등록된 관리자 → 허용
        } else {
            return ResponseEntity.status(403).build();
        }

        // 개인정보처리방침: 탈퇴자(DELETED)는 목록에 노출하지 않음
        Page<Member> page = memberRepository.findByStatusNot(MemberStatus.DELETED, pageable);
        return ResponseEntity.ok(page.map(AdminMemberListItemDto::from));
    }

    /** 정지 적용: type = 2W, 1M, 1Y, PERMANENT, NONE(정지해제) */
    @PatchMapping("/{memberId}/suspend")
    public ResponseEntity<Void> suspend(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long memberId,
            @RequestBody SuspendRequestDto request) {
        Member current = memberRepository.findById(Long.parseLong(userDetails.getUsername()))
                .orElseThrow(() -> new RuntimeException("회원 정보가 없습니다."));
        if (current.getRole() != Role.ADMIN && !isInAdminEmails(current.getEmail()) && !isInAdminUserIds(current.getId())) {
            return ResponseEntity.status(403).build();
        }
        adminBlockService.suspend(memberId, request.getType());
        return ResponseEntity.ok().build();
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
