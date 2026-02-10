package com.dailo.backend.config;

import com.dailo.backend.jwt.JwtFilter;
import com.dailo.backend.jwt.TokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final TokenProvider tokenProvider;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /** Swagger/OpenAPI 경로는 Spring Security 적용 제외 (403 방지) */
    @Bean
    public WebSecurityCustomizer webSecurityCustomizer() {
        return (web) -> web.ignoring().requestMatchers(
                "/v3/api-docs",
                "/v3/api-docs/**",
                "/swagger-ui.html",
                "/swagger-ui/**",
                "/swagger-resources/**",
                "/webjars/**"
        );
    }

    /** 인증 안 된 요청은 401 반환 (403 대신) */
    @Bean
    public HttpStatusEntryPoint http401EntryPoint() {
        return new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED);
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // 세션 끄기 (JWT 필수 설정)
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )

            // 인증 실패 시 403 → 401 (재로그인 유도)
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(http401EntryPoint())
            )

            .authorizeHttpRequests(auth -> auth
                // Swagger / OpenAPI 문서 경로 전부 허용
                .requestMatchers(
                    "/v3/api-docs",
                    "/v3/api-docs/**",
                    "/swagger-ui.html",
                    "/swagger-ui/**",
                    "/swagger-resources/**",
                    "/webjars/**"
                ).permitAll()

                // 백엔드 동작 확인용 (브라우저에서 http://localhost:8080/ 또는 /hello)
                .requestMatchers("/", "/hello").permitAll()

                // 로그인, 회원가입만 비인증 허용 (GET /api/auth/me는 인증 필요)
                .requestMatchers("/api/auth/signup", "/api/auth/login").permitAll()
                .requestMatchers("/api/auth/**").authenticated()

                // 행사 조회(GET)
                .requestMatchers(HttpMethod.GET, "/api/events/**").permitAll()

                // 게시판·댓글 (비로그인 허용, X-User-Id로 작성자 구분)
                .requestMatchers(HttpMethod.GET, "/api/posts/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/posts", "/api/posts/*/comments").permitAll()
                .requestMatchers(HttpMethod.PUT, "/api/posts/*").permitAll()
                .requestMatchers(HttpMethod.DELETE, "/api/posts/*").permitAll()

                // 관리자 페이지 등
                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                // 그 외는 인증 필요
                .anyRequest().authenticated()
            )

            .addFilterBefore(new JwtFilter(tokenProvider), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /** CORS: 앱(Expo)에서 API 호출 시 PATCH 등 허용 */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
