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
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(c -> c.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)

                // 기본 로그인/BasicAuth 비활성화 (Invalid credentials 기본 로그인 화면 방지)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)

                // OAuth2 authorization_code 플로우는 state 저장이 필요할 수 있어 세션이 필요
                // (JWT 인증은 JwtFilter가 담당)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // 소셜 로그인 관련 경로 허용
                        .requestMatchers("/", "/login/**", "/oauth2/**", "/error").permitAll()

                        // Swagger 문서
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-resources/**").permitAll()

                        // 헬스체크
                        .requestMatchers("/health", "/actuator/health").permitAll()

                        // 로그인, 회원가입
                        .requestMatchers("/api/auth/**").permitAll()

                        // 행사 조회
                        .requestMatchers(HttpMethod.GET, "/api/events/**").permitAll()

                        // 인증이 필요한 마이페이지 관련
                        .requestMatchers(HttpMethod.GET, "/api/posts/my").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/posts/liked").authenticated()

                        // 게시판·댓글 조회
                        .requestMatchers(HttpMethod.GET, "/api/posts/**").permitAll()

                        // 게시판 작성/수정/삭제는 인증 필요
                        .requestMatchers(HttpMethod.POST, "/api/posts/**").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/posts/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/posts/**").authenticated()

                        // 업로드 이미지 및 기타 콘텐츠
                        .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/upload").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/content/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/inquiries").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/notices/**").permitAll()
                        .requestMatchers("/api/logs/click", "/api/logs/click/**").permitAll()

                        // 관리자 API
                        .requestMatchers(HttpMethod.GET, "/api/admin/members").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/admin/blocks/heavy-blocked").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/admin/members/*/suspend").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/admin/members/*/withdraw").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/admin/crawler/**").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        // 기타 기능
                        .requestMatchers("/api/scraps/**").authenticated()
                        .requestMatchers("/api/location/**").authenticated()

                        .anyRequest().authenticated()
                )

                // OAuth2 로그인 설정
                .oauth2Login(oauth2 -> oauth2
                        .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
                        // 성공 시 JWT(JSON) 응답
                        .successHandler(oAuth2SuccessHandler)
                )

                // JWT 필터 다시 활성화
                .addFilterBefore(new JwtFilter(tokenProvider, memberRepository), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
