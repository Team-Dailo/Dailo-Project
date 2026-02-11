package com.dailo.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.dailo.backend.jwt.JwtFilter;
import com.dailo.backend.jwt.TokenProvider;

import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final TokenProvider tokenProvider;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            // 세션 끄기 (JWT 필수 설정)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            .authorizeHttpRequests(auth -> auth
                // Swagger 문서는 누구나 접근 가능
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-resources/**").permitAll()

                // 백엔드 동작 확인용
                .requestMatchers("/", "/hello").permitAll()

                // 로그인, 회원가입
                .requestMatchers("/api/auth/**").permitAll()

                // 행사 조회
                .requestMatchers(HttpMethod.GET, "/api/events/**").permitAll()

                // 게시판·댓글
                .requestMatchers(HttpMethod.GET, "/api/posts/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/posts", "/api/posts/*/comments").permitAll()

                // ✅ Chat REST
                .requestMatchers("/api/chat/**").permitAll()

                // ✅ WebSocket / SockJS handshake 허용
                .requestMatchers("/ws/**").permitAll()
                .requestMatchers("/api/ws/**").permitAll()

                // 관리자 페이지
                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                // 그 외 모든 요청은 인증 필요
                .anyRequest().authenticated()
            )

            .addFilterBefore(new JwtFilter(tokenProvider), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
