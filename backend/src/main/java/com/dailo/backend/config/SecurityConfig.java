package com.dailo.backend.config;

import com.dailo.backend.jwt.JwtFilter;
import com.dailo.backend.jwt.TokenProvider;
import com.dailo.backend.repository.MemberRepository;

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
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final TokenProvider tokenProvider;
    private final MemberRepository memberRepository;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /** 에뮬레이터/실기기(Origin null 등)에서 API 호출 시 403 방지 */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(false);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(c -> c.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                // 세션 끄기 (JWT 필수 설정)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        //  Swagger 문서는 누구나 접근 가능
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-resources/**").permitAll()

                        // 헬스체크 (ALB Target Group)
                        .requestMatchers("/health", "/actuator/health").permitAll()

                        // 로그인, 회원가입
                        .requestMatchers("/api/auth/**").permitAll()

                        // 행사 조회
                        .requestMatchers(HttpMethod.GET, "/api/events/**").permitAll()

                        // 내가 쓴 글 / 좋아요 누른 글 (마이페이지) - 인증 필요
                        .requestMatchers(HttpMethod.GET, "/api/posts/my").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/posts/liked").authenticated()
                        // 게시판·댓글 조회 (비로그인도 목록/상세/댓글·게시판 사진 읽기 가능)
                        .requestMatchers(HttpMethod.GET, "/api/posts/**").permitAll()
                        // 게시판 작성/수정/삭제는 인증 필요
                        .requestMatchers(HttpMethod.POST, "/api/posts/**").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/posts/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/posts/**").authenticated()

                        // 업로드된 이미지 조회 (게시판 사진·프로필 등) - 로그아웃 사용자도 볼 수 있도록 공개
                        .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()

                        // 게시글 사진 등 이미지 업로드 (로그인 사용자)
                        .requestMatchers(HttpMethod.POST, "/api/upload").authenticated()

                        // 이용 안내 등 앱 콘텐츠 조회 (비로그인 포함)
                        .requestMatchers(HttpMethod.GET, "/api/content/**").permitAll()

                        // 문의하기 제출 (비로그인 가능)
                        .requestMatchers(HttpMethod.POST, "/api/inquiries").permitAll()

                        // 공지사항 조회 (비로그인 포함)
                        .requestMatchers(HttpMethod.GET, "/api/notices/**").permitAll()

                        // 조회수: 클릭 로그 기록·조회 (비로그인도 행사 상세 진입 시 기록/표시)
                        .requestMatchers("/api/logs/click", "/api/logs/click/**").permitAll()

                        // 회원 목록·차단관리: 인증만 필요, 컨트롤러에서 DB/설정 기준 ADMIN 여부 확인
                        .requestMatchers(HttpMethod.GET, "/api/admin/members").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/admin/blocks/heavy-blocked").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/admin/members/*/suspend").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/admin/members/*/withdraw").authenticated()
                        // 크롤러 API (테스트용 - 추후 인증 추가)
                        .requestMatchers(HttpMethod.POST, "/api/admin/crawler/**").permitAll()
                        // 그 외 관리자 API
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        // 스크랩 기능은 "로그인한 사람"만 가능
                        .requestMatchers("/api/scraps/**").authenticated()

                        // 위치 기반 체류 인증 API (로그인 사용자만)
                        .requestMatchers("/api/location/**").authenticated()

                        // 그 외 모든 요청(스크랩, 마이페이지 등)은 '인증된 사용자'만 가능
                        .anyRequest().authenticated()
                )

                .addFilterBefore(new JwtFilter(tokenProvider, memberRepository), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
