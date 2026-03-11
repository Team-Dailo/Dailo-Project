package com.dailo.backend.config;

import com.dailo.backend.jwt.JwtFilter;
import com.dailo.backend.jwt.OAuth2SuccessHandler;
import com.dailo.backend.jwt.TokenProvider;
import com.dailo.backend.repository.MemberRepository;
import com.dailo.backend.service.CustomOAuth2UserService;
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
    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;

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
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)

                // 기본 로그인 / BasicAuth 비활성화
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)

                // OAuth2 state 저장을 위해 세션은 필요할 때만 사용
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                )

                .authorizeHttpRequests(auth -> auth

                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // OAuth 로그인
                        .requestMatchers("/", "/login/**", "/oauth2/**", "/error").permitAll()

                        // Swagger
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-resources/**").permitAll()

                        // 헬스체크
                        .requestMatchers("/health", "/actuator/health").permitAll()

                        // 로그인 / 회원가입
                        .requestMatchers("/api/auth/**").permitAll()

                        // 행사 조회
                        .requestMatchers(HttpMethod.GET, "/api/events/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/events/liked").authenticated()

                        // 게시판 조회
                        .requestMatchers(HttpMethod.GET, "/api/posts/**").permitAll()

                        // 게시판 작성
                        .requestMatchers(HttpMethod.POST, "/api/posts/**").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/posts/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/posts/**").authenticated()

                        // 마이페이지 관련
                        .requestMatchers(HttpMethod.GET, "/api/posts/my").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/posts/liked").authenticated()

                        // ⭐ 추가 (이게 핵심)
                        .requestMatchers("/api/members/**").authenticated()

                        // 업로드
                        .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/upload").authenticated()

                        // 기타 API
                        .requestMatchers(HttpMethod.GET, "/api/content/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/inquiries").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/notices/**").permitAll()
                        .requestMatchers("/api/logs/click", "/api/logs/click/**").permitAll()

                        // 관리자
                        .requestMatchers(HttpMethod.GET, "/api/admin/members").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/admin/blocks/heavy-blocked").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/admin/members/*/suspend").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/admin/members/*/withdraw").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/admin/crawler/**").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        // 기타
                        .requestMatchers("/api/scraps/**").authenticated()
                        .requestMatchers("/api/location/**").authenticated()

                        .anyRequest().authenticated()
                )

                // OAuth2 로그인
                .oauth2Login(oauth2 -> oauth2
                        .userInfoEndpoint(userInfo ->
                                userInfo.userService(customOAuth2UserService)
                        )
                        .successHandler(oAuth2SuccessHandler)
                )

                // JWT 필터
                .addFilterBefore(
                        new JwtFilter(tokenProvider, memberRepository),
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}