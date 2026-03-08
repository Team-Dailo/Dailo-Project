package com.dailo.backend.service;

import com.dailo.backend.entity.*;
import com.dailo.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final PushTokenRepository pushTokenRepository;
    private final MemberRepository memberRepository;
    private final NotificationSettingRepository notificationSettingRepository;
    private final FcmService fcmService;
    private final NotificationLogRepository notificationLogRepository;

    @Transactional
    public void registerToken(String email, String token, String deviceType) {
        pushTokenRepository.findByToken(token)
                .ifPresentOrElse(
                        existingToken -> existingToken.updateToken(token),
                        () -> {
                            // 💡 이메일로 회원 조회
                            Member member = memberRepository.findByEmail(email)
                                    .orElseThrow(() -> new IllegalArgumentException("해당 회원이 존재하지 않습니다."));

                            PushToken newToken = PushToken.builder()
                                    .member(member)
                                    .token(token)
                                    .deviceType(deviceType)
                                    .build();
                            pushTokenRepository.save(newToken);
                        }
                );
    }

    @Transactional
    public NotificationSetting getOrInitSetting(String email) {
        // 1. 먼저 이메일로 회원을 찾습니다.
        Member member = memberRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("해당 회원이 존재하지 않습니다."));

        // 2. 회원 ID로 설정을 조회하거나 새로 만듭니다.
        return notificationSettingRepository.findById(member.getId())
                .orElseGet(() -> {
                    NotificationSetting defaultSetting = NotificationSetting.builder()
                            .member(member)
                            .isNewEventEnabled(true)
                            .isEventReminderEnabled(true)
                            .build();
                    return notificationSettingRepository.save(defaultSetting);
                });
    }

    // 내부에서 Member 객체를 이미 가지고 있을 때 사용하는 오버로딩 메서드 (기존 sendPushNotification 호환용)
    @Transactional
    public NotificationSetting getOrInitSetting(Long memberId) {
        return notificationSettingRepository.findById(memberId)
                .orElseGet(() -> {
                    Member member = memberRepository.findById(memberId)
                            .orElseThrow(() -> new IllegalArgumentException("해당 회원이 존재하지 않습니다."));
                    NotificationSetting defaultSetting = NotificationSetting.builder()
                            .member(member)
                            .isNewEventEnabled(true)
                            .isEventReminderEnabled(true)
                            .build();
                    return notificationSettingRepository.save(defaultSetting);
                });
    }

    @Transactional
    public void updateSetting(String email, boolean newEvent, boolean reminder, String categories, String regions) {
        NotificationSetting setting = getOrInitSetting(email);
        // TODO: 세부 설정 업데이트 로직 구현 (필요 시)
    }

    @Transactional
    public void sendPushNotification(Member member, String title, String body) {
        NotificationSetting setting = getOrInitSetting(member.getId());

        if (!setting.isNewEventEnabled()) {
            log.info("사용자 {} 님이 알림을 비활성화하여 발송을 건너뜜.", member.getId());
            return;
        }

        List<PushToken> tokens = pushTokenRepository.findAllByMember(member);

        for (PushToken pushToken : tokens) {
            fcmService.sendMessage(pushToken.getToken(), title, body);
        }

        NotificationLog logEntry = NotificationLog.builder()
                .member(member)
                .title(title)
                .body(body)
                .build();
        notificationLogRepository.save(logEntry);
    }
}