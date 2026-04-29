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
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
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
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)

                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)

                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                )

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        .requestMatchers("/", "/login/**", "/oauth2/**", "/error").permitAll()

                        .requestMatchers("/api/admin/web/**").permitAll()

                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-resources/**").permitAll()

                        .requestMatchers("/health", "/actuator/health").permitAll()

                        .requestMatchers("/api/auth/**").permitAll()

                        .requestMatchers(HttpMethod.GET, "/api/events/liked").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/events/**").permitAll()

                        .requestMatchers(HttpMethod.GET, "/api/posts/my").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/posts/liked").authenticated()

                        .requestMatchers(HttpMethod.GET, "/api/posts/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/posts/**").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/posts/**").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/posts/**").authenticated()

                        .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.HEAD, "/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/static/**").permitAll()
                        .requestMatchers(HttpMethod.HEAD, "/static/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/upload").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/content/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/inquiries").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/notices/**").permitAll()
                        .requestMatchers("/api/logs/click", "/api/logs/click/**").permitAll()
                        .requestMatchers("/api/app-version/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/faq/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/banners/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/popups/**").permitAll()
                        .requestMatchers("/api/surveys/**").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/bus/**").permitAll()

                        .requestMatchers(HttpMethod.GET, "/api/admin/members").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/admin/blocks/heavy-blocked").authenticated()
                        .requestMatchers(HttpMethod.PATCH, "/api/admin/members/*/suspend").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/admin/members/*/withdraw").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/admin/crawler/**").permitAll()
                        .requestMatchers("/api/festival-admin/**").hasAnyRole("ADMIN", "FESTIVAL_ADMIN")
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        .requestMatchers("/api/scraps/**").authenticated()
                        .requestMatchers("/api/location/**").authenticated()

                        // 타 사용자 프로필 조회는 공개 (숫자 ID만 매칭)
                        .requestMatchers(HttpMethod.GET, "/api/members/{id:\\d+}").permitAll()
                        // 타 사용자 댓글 목록 조회는 공개
                        .requestMatchers(HttpMethod.GET, "/api/members/{id:\\d+}/comments").permitAll()
                        // 나머지 회원 API는 인증 필요
                        .requestMatchers("/api/members/**").authenticated()

                        .anyRequest().authenticated()
                )

                // API 요청은 인증 실패 시 로그인 페이지로 리다이렉트하지 말고 401 반환
                .exceptionHandling(exception -> exception
                        .defaultAuthenticationEntryPointFor(
                                new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED),
                                request -> request.getRequestURI().startsWith("/api/")
                        )
                )

                .oauth2Login(oauth2 -> oauth2
                        .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
                        .successHandler(oAuth2SuccessHandler)
                )

                .addFilterBefore(
                        new JwtFilter(tokenProvider, memberRepository),
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}