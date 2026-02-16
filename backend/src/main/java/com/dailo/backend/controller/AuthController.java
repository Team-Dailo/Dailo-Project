package com.dailo.backend.controller;

import com.dailo.backend.dto.auth.LoginRequestDto;
import com.dailo.backend.dto.auth.LoginResponseDto;
import com.dailo.backend.dto.auth.MemberRequestDto;
import com.dailo.backend.dto.auth.MemberResponseDto;
import com.dailo.backend.jwt.TokenDto;
import com.dailo.backend.service.AuthService;
import com.dailo.backend.service.LoginVerifyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth API", description = "회원가입 및 로그인 (JWT 발급)")
public class AuthController {
    private final AuthService authService;
    private final LoginVerifyService loginVerifyService;

    @Operation(summary = "회원가입", description = "이메일, 비밀번호, 닉네임을 입력하여 회원가입을 진행합니다.")
    @PostMapping("/signup")
    public ResponseEntity<MemberResponseDto> signup(@RequestBody MemberRequestDto requestDto) {
        return ResponseEntity.ok(authService.signup(requestDto));
    }

    @Operation(summary = "로그인", description = "이메일과 비밀번호로 로그인. 관리자 이메일은 이메일 확인 후 로그인 완료.")
    @PostMapping("/login")
    public ResponseEntity<LoginResponseDto> login(@RequestBody LoginRequestDto requestDto) {
        return ResponseEntity.ok(authService.login(requestDto));
    }

    @Operation(summary = "로그인 확인 링크", description = "이메일 내 확인 링크 클릭 시 호출. 앱으로 리다이렉트.")
    @GetMapping(value = "/confirm-login", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> confirmLogin(@RequestParam String token) {
        TokenDto dto = loginVerifyService.confirmAndCacheTokenDto(token);
        String appUrl = "app://login-verified?token=" + token;
        String html = "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><meta http-equiv=\"refresh\" content=\"0;url=" + appUrl + "\"></head><body><p>로그인이 완료되었습니다. 앱으로 돌아가 주세요.</p><p><a href=\"" + appUrl + "\">앱에서 열기</a></p></body></html>";
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .body(html);
    }

    @Operation(summary = "로그인 토큰 교환", description = "앱에서 딥링크로 받은 토큰으로 JWT 발급.")
    @PostMapping("/exchange-login-token")
    public ResponseEntity<TokenDto> exchangeLoginToken(@RequestBody Map<String, String> body) {
        String token = body != null ? body.get("token") : null;
        if (token == null || token.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        TokenDto dto = loginVerifyService.exchangeTokenAndRemove(token);
        return ResponseEntity.ok(dto);
    }
}