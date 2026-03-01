package com.dailo.backend.controller;

import com.dailo.backend.dto.auth.LoginRequestDto;
import com.dailo.backend.dto.auth.MemberRequestDto;
import com.dailo.backend.dto.auth.MemberResponseDto;
import com.dailo.backend.jwt.TokenDto;
import com.dailo.backend.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth API", description = "회원가입 / 로그인 / 이메일 인증 / 비밀번호 재설정")
public class AuthController {

    private final AuthService authService;

    /* ================= 1. 회원가입 사전 이메일 인증 ================= */

    @Operation(summary = "회원가입 인증번호 발송", description = "가입 전 이메일 중복 확인 후 6자리 인증번호를 메일로 발송합니다.")
    @PostMapping("/email/send")
    public ResponseEntity<Void> sendSignUpEmail(
            @RequestParam("email") String email
    ) {
        authService.sendSignUpEmail(email);
        return ResponseEntity.noContent().build(); // 204
    }


    /* ================= 2. 회원가입 / 로그인 ================= */

    @Operation(summary = "회원가입 (인증 완료 및 최종 가입)", description = "이메일, 비밀번호, 닉네임과 함께 발급받은 '인증번호(authCode)'를 보내 최종 가입합니다.")
    @PostMapping("/signup")
    public ResponseEntity<MemberResponseDto> signup(
            @Valid @RequestBody MemberRequestDto requestDto
    ) {
        return ResponseEntity.ok(authService.signup(requestDto));
    }

    @Operation(summary = "로그인", description = "이메일과 비밀번호로 JWT를 발급합니다.")
    @PostMapping("/login")
    public ResponseEntity<TokenDto> login(
            @RequestBody LoginRequestDto requestDto
    ) {
        return ResponseEntity.ok(authService.login(requestDto));
    }


    /* ================= 3. 비밀번호 재설정 ================= */

    @Operation(summary = "비밀번호 재설정 요청", description = "가입된 이메일로 비밀번호 재설정용 64자리 토큰을 발송합니다.")
    @PostMapping("/password-reset/request")
    public ResponseEntity<Void> requestPasswordReset(
            @RequestParam("email") String email
    ) {
        authService.requestPasswordReset(email);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "비밀번호 재설정 완료", description = "메일로 받은 토큰과 새로운 비밀번호를 입력해 비밀번호를 변경합니다.")
    @PostMapping("/password-reset/confirm")
    public ResponseEntity<Void> confirmPasswordReset(
            @RequestParam("token") String token,
            @RequestParam("newPassword") String newPassword
    ) {
        authService.confirmPasswordReset(token, newPassword);
        return ResponseEntity.noContent().build();
    }

    /* ================= 4. 토큰 재발급 ================= */

    @Operation(summary = "토큰 재발급", description = "만료된 Access Token과 Refresh Token을 보내 새로운 토큰 셋을 발급받습니다.")
    @PostMapping("/reissue")
    public ResponseEntity<TokenDto> reissue(
            @RequestBody com.dailo.backend.dto.auth.TokenRequestDto requestDto
    ) {
        return ResponseEntity.ok(authService.reissue(requestDto));
    }
    /* ================= 5. 로그아웃================= */

    @Operation(summary = "로그아웃", description = "DB에서 사용자의 Refresh Token을 삭제합니다.")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        // JWT 필터를 통과한 유저 정보에서 이메일 추출하여 삭제
        authService.logout(userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}