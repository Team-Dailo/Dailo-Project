package com.dailo.backend.controller;

import com.dailo.backend.dto.auth.MemberProfileResponseDto;
import com.dailo.backend.dto.auth.MemberResponseDto;
import com.dailo.backend.dto.auth.MemberUpdateRequestDto;
import com.dailo.backend.service.MemberService;
import com.dailo.backend.service.S3UploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;
    private final S3UploadService s3UploadService;

    @GetMapping("/me")
    public ResponseEntity<MemberResponseDto> getMyProfile(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            throw new RuntimeException("인증된 사용자 정보가 없습니다.");
        }

        String principal = userDetails.getUsername();
        return ResponseEntity.ok(memberService.getMyProfile(principal));
    }

    @PatchMapping("/me")
    public ResponseEntity<MemberResponseDto> updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody MemberUpdateRequestDto request) {
        String principal = userDetails.getUsername();
        return ResponseEntity.ok(memberService.updateProfile(principal, request));
    }

    @DeleteMapping("/me")
    public ResponseEntity<Map<String, String>> withdraw(@AuthenticationPrincipal UserDetails userDetails) {
        String principal = userDetails.getUsername();
        memberService.withdraw(principal);

        Map<String, String> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "탈퇴 처리되었습니다.");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/check-nickname")
    public ResponseEntity<Map<String, Boolean>> checkNickname(@RequestParam String nickname) {
        boolean isDuplicate = memberService.checkNicknameDuplicate(nickname);

        Map<String, Boolean> response = new HashMap<>();
        response.put("isAvailable", !isDuplicate);
        return ResponseEntity.ok(response);
    }

    /**
     * 타 사용자 프로필 조회 (ID 기반)
     * 댓글 작성자 프로필 보기 등에서 사용
     */
    @GetMapping("/{id}")
    public ResponseEntity<MemberProfileResponseDto> getMemberProfile(@PathVariable Long id) {
        return ResponseEntity.ok(memberService.getMemberProfile(id));
    }

    @PostMapping(value = "/me/image", consumes = "multipart/form-data")
    public ResponseEntity<Map<String, String>> uploadProfileImage(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestPart("file") MultipartFile file) throws IOException {

        String principal = userDetails.getUsername();

        String imageKey = s3UploadService.upload(file, "profile");
        memberService.updateProfileImage(principal, imageKey);

        String imageUrl = s3UploadService.getPresignedUrl(imageKey);
        Map<String, String> response = new HashMap<>();
        response.put("imageUrl", imageUrl);

        return ResponseEntity.ok(response);
    }
}