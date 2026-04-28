package com.dailo.backend.service;

import com.dailo.backend.domain.enums.StayStatus;
import com.dailo.backend.entity.StaySession;
import com.dailo.backend.repository.StaySessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class StaySessionScheduler {

    private final StaySessionRepository staySessionRepository;
    private final NotificationService notificationService;

    private static final long PING_TIMEOUT_MINUTES = 3;
    private static final long MISSION_MINUTES = 30;

    @Scheduled(fixedRate = 60_000)
    @Transactional
    public void expireInactiveSessions() {
        List<StaySession> pendings = staySessionRepository.findByStatus(StayStatus.PENDING);
        LocalDateTime now = LocalDateTime.now();

        for (StaySession s : pendings) {
            if (s.getLastPingTime() == null) {
                continue;
            }
            long minutes = Duration.between(s.getLastPingTime(), now).toMinutes();
            if (minutes >= PING_TIMEOUT_MINUTES) {
                s.completeSession();
                log.info("PING timeout auto-complete: sessionId={}", s.getId());
            }
        }
    }

    /** 30분 체류 미션 달성 시 푸시 알림 발송 (1분마다 체크) */
    @Scheduled(fixedRate = 60_000)
    @Transactional
    public void sendMissionCompletionNotifications() {
        List<StaySession> sessions = staySessionRepository.findPendingNeedingMissionNotification(MISSION_MINUTES);

        for (StaySession s : sessions) {
            String eventTitle = s.getEvent().getTitle();
            String title = "🎉 체류 미션 완료!";
            String body = String.format("[%s] 구역에 30분 이상 머무셨어요! 미션을 달성했습니다.", eventTitle);

            try {
                notificationService.sendPushNotification(s.getMember(), title, body);
                s.markMissionNotified();
                log.info("미션 완료 알림 발송: sessionId={}, memberId={}, event={}",
                        s.getId(), s.getMember().getId(), eventTitle);
            } catch (Exception e) {
                log.error("미션 완료 알림 발송 실패: sessionId={}, error={}", s.getId(), e.getMessage());
            }
        }
    }
}