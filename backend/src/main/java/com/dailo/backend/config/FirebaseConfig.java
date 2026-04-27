package com.dailo.backend.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import jakarta.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Slf4j
@Configuration
public class FirebaseConfig {

    @Value("${FIREBASE_CREDENTIALS_JSON:}")
    private String firebaseCredentialsJson;

    @PostConstruct
    public void init() {
        try {
            InputStream credentialsStream = getCredentialsStream();

            if (credentialsStream == null) {
                log.warn("FCM: Firebase 인증 정보가 없습니다. 푸시 알림 기능이 비활성화됩니다.");
                return;
            }

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(credentialsStream))
                    .build();

            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(options);
                log.info("FCM: Firebase Admin SDK 초기화 성공");
            }
        } catch (IOException e) {
            log.error("FCM: Firebase 초기화 중 오류 발생: {}", e.getMessage());
        }
    }

    private InputStream getCredentialsStream() throws IOException {
        // 1. 환경변수 FIREBASE_CREDENTIALS_JSON 우선 사용 (프로덕션)
        if (firebaseCredentialsJson != null && !firebaseCredentialsJson.isBlank()) {
            log.info("FCM: 환경변수에서 Firebase 인증 정보 로드");
            return new ByteArrayInputStream(firebaseCredentialsJson.getBytes(StandardCharsets.UTF_8));
        }

        // 2. 로컬 파일 사용 (개발 환경)
        ClassPathResource resource = new ClassPathResource("firebase/dailo-firebase-adminsdk.json");
        if (resource.exists()) {
            log.info("FCM: 로컬 파일에서 Firebase 인증 정보 로드");
            return resource.getInputStream();
        }

        return null;
    }
}