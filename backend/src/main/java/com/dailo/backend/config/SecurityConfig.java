package com.dailo.backend.config;

import com.dailo.backend.jwt.JwtFilter;
import com.dailo.backend.jwt.TokenProvider;

import lombok.RequiredArgsConstructor;
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
                        //  Swagger 문서는 누구나 접근 가능
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-resources/**").permitAll()

                        // 로그인, 회원가입
                        .requestMatchers("/api/auth/**").permitAll()

                        // 행사 조회
                        .requestMatchers(HttpMethod.GET, "/api/events/**").permitAll()

                        // 게시판·댓글 조회 (비로그인도 목록/상세/댓글 읽기 가능)
                        .requestMatchers(HttpMethod.GET, "/api/posts/**").permitAll()
                        // 게시판 작성/수정/삭제는 인증 필요
                        .requestMatchers(HttpMethod.POST, "/api/posts/**").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/posts/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/posts/**").authenticated()

                        // 이용 안내 등 앱 콘텐츠 조회 (비로그인 포함)
                        .requestMatchers(HttpMethod.GET, "/api/content/**").permitAll()

                        // 관리자 페이지 등 (필요하면 유지)
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        // 스크랩 기능은 "로그인한 사람"만 가능
                        .requestMatchers("/api/scraps/**").authenticated()

                        // 그 외 모든 요청(스크랩, 마이페이지 등)은 '인증된 사용자'만 가능
                        .anyRequest().authenticated()
                )

                .addFilterBefore(new JwtFilter(tokenProvider), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
