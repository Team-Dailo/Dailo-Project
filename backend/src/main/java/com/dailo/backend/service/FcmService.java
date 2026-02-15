package com.dailo.backend.service;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

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
        try {
            // 알림 객체 생성
            Notification notification = Notification.builder()
                    .setTitle(title)
                    .setBody(body)
                    .build();

            // FCM 메시지 구성
            Message message = Message.builder()
                    .setToken(targetToken)
                    .setNotification(notification)
                    .build();

            // Firebase 서버로 발송 요청
            String response = FirebaseMessaging.getInstance().send(message);
            log.info("FCM: 메시지 발송 성공. Response: {}", response);

        } catch (Exception e) {
            log.error("FCM: 메시지 발송 실패. 대상 토큰: {}, 에러: {}", targetToken, e.getMessage());
        }
    }
}