package com.dailo.backend.scheduler;

import com.dailo.backend.service.FestivalCrawlerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class FestivalCrawlerScheduler {

    private final FestivalCrawlerService festivalCrawlerService;

    /**
     * 매주 월요일 새벽 3시에 축제 데이터 크롤링
     * cron: 초 분 시 일 월 요일
     */
    @Scheduled(cron = "0 0 3 * * MON")
    public void crawlFestivals() {
        log.info("=== 축제 크롤링 스케줄러 시작 ===");

        try {
            int savedCount = festivalCrawlerService.fetchAndSaveEvents();
            log.info("=== 축제 크롤링 스케줄러 완료: {}개 저장 ===", savedCount);
        } catch (Exception e) {
            log.error("축제 크롤링 스케줄러 실패", e);
        }
    }
}
