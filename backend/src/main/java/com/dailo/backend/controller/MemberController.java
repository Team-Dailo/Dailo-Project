package com.dailo.backend.controller;

import com.dailo.backend.dto.auth.MemberResponseDto;
import com.dailo.backend.dto.auth.MemberUpdateRequestDto;
import com.dailo.backend.service.MemberService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    // 내 정보 조회
    @GetMapping("/me")
    public ResponseEntity<MemberResponseDto> getMyProfile(@AuthenticationPrincipal UserDetails userDetails) {
        Long memberId = Long.parseLong(userDetails.getUsername());
        return ResponseEntity.ok(memberService.getMyProfile(memberId));
    }

    @PatchMapping("/me")
    public ResponseEntity<MemberResponseDto> updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody MemberUpdateRequestDto request) {
        Long memberId = Long.parseLong(userDetails.getUsername());
        return ResponseEntity.ok(memberService.updateProfile(memberId, request));
    }

    @DeleteMapping("/me")
    public ResponseEntity<String> withdraw(@AuthenticationPrincipal UserDetails userDetails) {
        Long memberId = Long.parseLong(userDetails.getUsername());
        memberService.withdraw(memberId);
        return ResponseEntity.ok("회원 탈퇴 완료");
    }
}