package com.dailo.backend.config;

import com.dailo.backend.service.EventViewCountUpdateService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 주기적으로 이벤트 viewCount7d, viewCount30d 갱신 (클릭 로그 집계).
 */
@Component
@RequiredArgsConstructor
public class ViewCountScheduler {

    private final EventViewCountUpdateService eventViewCountUpdateService;

    @Scheduled(cron = "0 0 * * * *") // 매시 정각
    public void updateEventViewCounts() {
        eventViewCountUpdateService.updateViewCounts();
    }
}
