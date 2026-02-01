package com.dailo.backend.controller;

import com.dailo.backend.service.AuthService;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/signup")
    public String signup(@RequestBody SignupRequest request) {
        authService.signup(request.email, request.password, request.nickname);
        return "회원가입 성공";
    }

    @PostMapping("/login")
    public TokenResponse login(@RequestBody LoginRequest request) {
        String token = authService.login(request.email, request.password);
        return new TokenResponse(token);
    }

    // DTO 클래스들 (편의상 내부에 작성)
    @Data
    static class SignupRequest { private String email; private String password; private String nickname; }

    @Data
    static class LoginRequest { private String email; private String password; }

    @Data
    @AllArgsConstructor // 롬복 필요
    static class TokenResponse { private String accessToken; }
}