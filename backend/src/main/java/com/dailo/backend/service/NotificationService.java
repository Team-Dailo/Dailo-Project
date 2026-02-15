package com.dailo.backend.service;

import com.dailo.backend.entity.*;
import com.dailo.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j; // [추가]
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
    public void registerToken(Long memberId, String token, String deviceType) {
        pushTokenRepository.findByToken(token)
                .ifPresentOrElse(
                        existingToken -> existingToken.updateToken(token),
                        () -> {
                            Member member = memberRepository.findById(memberId)
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

    @Transactional(readOnly = true)
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
    public void updateSetting(Long memberId, boolean newEvent, boolean reminder, String categories, String regions) {
        NotificationSetting setting = getOrInitSetting(memberId);
    }

    @Transactional
    public void sendPushNotification(Member member, String title, String body) {
        NotificationSetting setting = getOrInitSetting(member.getId());

        if (!setting.isNewEventEnabled()) {
            log.info("사용자 {} 님이 알림을 비활성화하여 발송을 건너뜁니다.", member.getId());
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