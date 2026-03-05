package com.dailo.backend.service;

import com.dailo.backend.domain.enums.StayStatus;
import com.dailo.backend.entity.StaySession;
import com.dailo.backend.repository.StaySessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class StaySessionScheduler {

    private final StaySessionRepository staySessionRepository;

    // ping이 3분 이상 안 오면 자동 종료
    private static final long PING_TIMEOUT_MINUTES = 3;

    // 1분마다 체크
    @Scheduled(fixedRate = 60_000)
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
}