package com.dailo.backend.controller;

import com.dailo.backend.dto.auth.LoginRequestDto;
import com.dailo.backend.dto.auth.LoginResponseDto;
import com.dailo.backend.dto.auth.MemberRequestDto;
import com.dailo.backend.dto.auth.MemberResponseDto;
import com.dailo.backend.dto.auth.NicknameUpdateRequestDto;
import com.dailo.backend.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth API", description = "회원가입 및 로그인 (JWT 발급)")
public class AuthController {
    private final AuthService authService;

    @Operation(summary = "회원가입", description = "이메일, 비밀번호, 닉네임을 입력하여 회원가입을 진행합니다.")
    @PostMapping("/signup")
    public ResponseEntity<MemberResponseDto> signup(@RequestBody MemberRequestDto requestDto) {
        return ResponseEntity.ok(authService.signup(requestDto));
    }

    @Operation(summary = "로그인", description = "이메일과 비밀번호로 로그인하여 JWT 토큰(Access + Refresh)과 닉네임을 반환합니다.")
    @PostMapping("/login")
    public ResponseEntity<LoginResponseDto> login(@RequestBody LoginRequestDto requestDto) {
        return ResponseEntity.ok(authService.login(requestDto));
    }

    @Operation(summary = "내 정보", description = "JWT로 로그인한 현재 사용자의 이메일·닉네임을 반환합니다.")
    @GetMapping("/me")
    public ResponseEntity<MemberResponseDto> me() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) {
            return ResponseEntity.status(401).build();
        }
        String email = auth.getName();
        return ResponseEntity.ok(authService.getMe(email));
    }

    @Operation(summary = "닉네임 변경", description = "JWT로 로그인한 현재 사용자의 닉네임을 변경합니다.")
    @PatchMapping("/me/nickname")
    public ResponseEntity<MemberResponseDto> updateNickname(@RequestBody NicknameUpdateRequestDto requestDto) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal() == null) {
            return ResponseEntity.status(401).build();
        }
        String email = auth.getName();
        return ResponseEntity.ok(authService.updateNickname(email, requestDto.getNickname()));
    }
}