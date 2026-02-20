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

@RestController
@RequestMapping("/api/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;
    private final S3UploadService s3UploadService;

    // 내 정보 조회
    @GetMapping("/me")
    public ResponseEntity<MemberResponseDto> getMyProfile(@AuthenticationPrincipal UserDetails userDetails) {
        Long memberId = Long.parseLong(userDetails.getUsername());
        return ResponseEntity.ok(memberService.getMyProfile(memberId));
    }

    // 프로필 수정
    @PatchMapping("/me")
    public ResponseEntity<MemberResponseDto> updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody MemberUpdateRequestDto request) {
        Long memberId = Long.parseLong(userDetails.getUsername());
        return ResponseEntity.ok(memberService.updateProfile(memberId, request));
    }

    // 회원 탈퇴
    @DeleteMapping("/me")
    public ResponseEntity<String> withdraw(@AuthenticationPrincipal UserDetails userDetails) {
        Long memberId = Long.parseLong(userDetails.getUsername());
        memberService.withdraw(memberId);
        return ResponseEntity.ok("회원 탈퇴 완료");
    }

    // 닉네임 중복 체크
    @GetMapping("/check-nickname")
    public ResponseEntity<Boolean> checkNickname(@RequestParam String nickname) {
        return ResponseEntity.ok(memberService.checkNicknameDuplicate(nickname));
    }

    // 프로필 이미지 업로드 API
    @PostMapping(value = "/me/image", consumes = "multipart/form-data")
    public ResponseEntity<MemberResponseDto> uploadProfileImage(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestPart("file") MultipartFile file) throws IOException {

        Long memberId = Long.parseLong(userDetails.getUsername());

        // 1. 팀장님이 만든 S3 서비스로 파일 업로드 (디렉토리명은 "profile"로 지정)
        String imageKey = s3UploadService.upload(file, "profile");

        // 2. DB에 업로드된 Key 저장 (MemberService에 updateProfileImage 메서드 추가 필요)
        MemberResponseDto updatedMember = memberService.updateProfileImage(memberId, imageKey);

        return ResponseEntity.ok(updatedMember);
    }
}