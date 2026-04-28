package com.dailo.backend.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class FcmService {

    /**
     * 단일 기기에 푸시 알림 발송
     * @param targetToken 대상 기기의 FCM 토큰
     * @param title 알림 제목
     * @param body 알림 내용
     */
    public void sendMessage(String targetToken, String title, String body) {
        if (!isFirebaseInitialized()) {
            log.warn("FCM: Firebase가 초기화되지 않아 메시지를 발송할 수 없습니다.");
            return;
        }

        try {
            Notification notification = Notification.builder()
                    .setTitle(title)
                    .setBody(body)
                    .build();

            Message message = Message.builder()
                    .setToken(targetToken)
                    .setNotification(notification)
                    .build();

            String response = FirebaseMessaging.getInstance().send(message);
            log.info("FCM: 메시지 발송 성공. Response: {}", response);

        } catch (Exception e) {
            log.error("FCM: 메시지 발송 실패. 대상 토큰: {}, 에러: {}", targetToken, e.getMessage());
        }
    }

    /**
     * 다중 기기에 푸시 알림 발송 (Multicast)
     * @param tokens 대상 기기들의 FCM 토큰 목록 (최대 500개)
     * @param title 알림 제목
     * @param body 알림 내용
     * @return 발송 결과 (성공 수, 실패 수)
     */
    public MulticastResult sendMulticastMessage(List<String> tokens, String title, String body) {
        if (!isFirebaseInitialized()) {
            log.warn("FCM: Firebase가 초기화되지 않아 메시지를 발송할 수 없습니다.");
            return new MulticastResult(0, tokens.size(), List.of());
        }

        if (tokens == null || tokens.isEmpty()) {
            log.warn("FCM: 발송 대상 토큰이 없습니다.");
            return new MulticastResult(0, 0, List.of());
        }

        // 유효한 토큰만 필터링
        List<String> validTokens = tokens.stream()
                .filter(token -> token != null && !token.isBlank())
                .toList();

        if (validTokens.isEmpty()) {
            log.warn("FCM: 유효한 토큰이 없습니다.");
            return new MulticastResult(0, 0, List.of());
        }

        int totalSuccess = 0;
        int totalFailure = 0;
        List<String> failedTokens = new ArrayList<>();

        // FCM은 한 번에 최대 500개 토큰만 처리 가능
        int batchSize = 500;
        for (int i = 0; i < validTokens.size(); i += batchSize) {
            List<String> batch = validTokens.subList(i, Math.min(i + batchSize, validTokens.size()));

            try {
                Notification notification = Notification.builder()
                        .setTitle(title)
                        .setBody(body)
                        .build();

                MulticastMessage message = MulticastMessage.builder()
                        .addAllTokens(batch)
                        .setNotification(notification)
                        .build();

                BatchResponse response = FirebaseMessaging.getInstance().sendEachForMulticast(message);

                totalSuccess += response.getSuccessCount();
                totalFailure += response.getFailureCount();

                // 실패한 토큰 수집
                if (response.getFailureCount() > 0) {
                    List<SendResponse> responses = response.getResponses();
                    for (int j = 0; j < responses.size(); j++) {
                        if (!responses.get(j).isSuccessful()) {
                            failedTokens.add(batch.get(j));
                        }
                    }
                }

                log.info("FCM Multicast: 배치 발송 완료. 성공: {}, 실패: {}",
                        response.getSuccessCount(), response.getFailureCount());

            } catch (Exception e) {
                log.error("FCM Multicast: 배치 발송 실패. 에러: {}", e.getMessage());
                totalFailure += batch.size();
                failedTokens.addAll(batch);
            }
        }

        log.info("FCM Multicast: 전체 발송 완료. 총 성공: {}, 총 실패: {}", totalSuccess, totalFailure);
        return new MulticastResult(totalSuccess, totalFailure, failedTokens);
    }

    /**
     * 전체 사용자에게 푸시 알림 발송 (토픽 기반)
     * @param title 알림 제목
     * @param body 알림 내용
     * @param topic 토픽 이름 (예: "all", "notice")
     */
    public void sendToTopic(String topic, String title, String body) {
        if (!isFirebaseInitialized()) {
            log.warn("FCM: Firebase가 초기화되지 않아 메시지를 발송할 수 없습니다.");
            return;
        }

        try {
            Notification notification = Notification.builder()
                    .setTitle(title)
                    .setBody(body)
                    .build();

            Message message = Message.builder()
                    .setTopic(topic)
                    .setNotification(notification)
                    .build();

            String response = FirebaseMessaging.getInstance().send(message);
            log.info("FCM Topic: 토픽 '{}' 메시지 발송 성공. Response: {}", topic, response);

        } catch (Exception e) {
            log.error("FCM Topic: 토픽 '{}' 메시지 발송 실패. 에러: {}", topic, e.getMessage());
        }
    }

    private boolean isFirebaseInitialized() {
        return !FirebaseApp.getApps().isEmpty();
    }

    /**
     * Multicast 발송 결과
     */
    public record MulticastResult(int successCount, int failureCount, List<String> failedTokens) {}
}