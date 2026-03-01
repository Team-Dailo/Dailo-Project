package com.dailo.backend.controller;

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

    // 1. 내 정보 조회
    @GetMapping("/me")
    public ResponseEntity<MemberResponseDto> getMyProfile(@AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername(); // 💡 Long 파싱 제거!
        return ResponseEntity.ok(memberService.getMyProfile(email));
    }

    // 2. 프로필 수정
    @PatchMapping("/me")
    public ResponseEntity<MemberResponseDto> updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody MemberUpdateRequestDto request) {
        String email = userDetails.getUsername(); // 💡 Long 파싱 제거!
        return ResponseEntity.ok(memberService.updateProfile(email, request));
    }

    // 3. 회원 탈퇴
    @DeleteMapping("/me")
    public ResponseEntity<Map<String, String>> withdraw(@AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername(); // 💡 Long 파싱 제거!
        memberService.withdraw(email);

        // 💡 기획서 명세대로 JSON 반환
        Map<String, String> response = new HashMap<>();
        response.put("status", "SUCCESS");
        response.put("message", "탈퇴 처리되었습니다.");
        return ResponseEntity.ok(response);
    }

    // 4. 닉네임 중복 체크
    @GetMapping("/check-nickname")
    public ResponseEntity<Map<String, Boolean>> checkNickname(@RequestParam String nickname) {
        boolean isDuplicate = memberService.checkNicknameDuplicate(nickname);

        // 💡 기획서 명세대로 { "isAvailable": true/false } 반환
        Map<String, Boolean> response = new HashMap<>();
        response.put("isAvailable", !isDuplicate); // 중복이 아니어야 사용 가능(true)
        return ResponseEntity.ok(response);
    }

    // 5. 프로필 이미지 업로드 API
    @PostMapping(value = "/me/image", consumes = "multipart/form-data")
    public ResponseEntity<Map<String, String>> uploadProfileImage(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestPart("file") MultipartFile file) throws IOException {

        String email = userDetails.getUsername(); // 💡 Long 파싱 제거!

        String imageKey = s3UploadService.upload(file, "profile");
        memberService.updateProfileImage(email, imageKey);

        // 💡 기획서 명세대로 이미지 URL만 JSON으로 반환
        String imageUrl = s3UploadService.getPresignedUrl(imageKey);
        Map<String, String> response = new HashMap<>();
        response.put("imageUrl", imageUrl);

        return ResponseEntity.ok(response);
    }
}