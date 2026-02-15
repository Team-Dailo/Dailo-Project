package com.dailo.backend.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import lombok.extern.slf4j.Slf4j; // [추가] 로깅 라이브러리
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import jakarta.annotation.PostConstruct;
import java.io.IOException;

@Slf4j
@Configuration
public class FirebaseConfig {

    @PostConstruct
    public void init() {
        try {
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(
                            new ClassPathResource("firebase/dailo-firebase-adminsdk.json").getInputStream()))
                    .build();

            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(options);
                log.info("FCM: Firebase Admin SDK 초기화 성공"); // [변경] 성공 로그
            }
        } catch (IOException e) {
            log.error("FCM: Firebase 초기화 중 오류 발생: {}", e.getMessage()); // [변경] 에러 로그 및 추적 가능 정보
        }
    }
}