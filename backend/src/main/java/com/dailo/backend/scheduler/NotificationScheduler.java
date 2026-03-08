package com.dailo.backend.scheduler;

import com.dailo.backend.entity.Event;
import com.dailo.backend.entity.Member;
import com.dailo.backend.repository.EventRepository;
import com.dailo.backend.repository.ScrapRepository;
import com.dailo.backend.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationScheduler {

    private final EventRepository eventRepository;
    private final ScrapRepository scrapRepository; // [추가] 스크랩 유저 조회를 위해 필요
    private final NotificationService notificationService;

    // 매일 오전 9시에 실행 (D-1 행사 알림)

    @Scheduled(cron = "0 0 9 * * *")
    public void sendEventReminder() {
        log.info("D-1 맞춤형 행사 알림 스케줄러 실행 시작");

        // 내일 시작하는 날짜 범위 설정
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        LocalDateTime startOfTomorrow = tomorrow.atStartOfDay();
        LocalDateTime endOfTomorrow = tomorrow.atTime(LocalTime.MAX);

        // 내일 시작하는 행사 조회
        List<Event> tomorrowEvents = eventRepository.findByStartAtBetween(startOfTomorrow, endOfTomorrow);

        if (tomorrowEvents.isEmpty()) {
            log.info("내일 시작하는 행사가 없어 알림을 발송하지 않습니다.");
            return;
        }

        // 행사별로 스크랩한 유저 타겟 발송
        int totalSentCount = 0;
        for (Event event : tomorrowEvents) {
            // 해당 이벤트를 스크랩한 회원들만
            List<Member> targetMembers = scrapRepository.findAllMemberByEventId(event.getId());

            if (targetMembers.isEmpty()) {
                log.info("행사 [{}]를 스크랩한 사용자가 없어 알림을 건너뜁니다.", event.getTitle());
                continue;
            }

            String title = "⏰ 내일 시작! 잊지 않으셨죠?";
            String body = String.format("스크랩하신 [%s] 행사가 내일 시작됩니다. 놓치지 마세요!", event.getTitle());

            for (Member member : targetMembers) {
                notificationService.sendPushNotification(member, title, body);
                totalSentCount++;
            }
        }

        log.info("D-1 행사 알림 발송 완료: 총 {}개 행사, {}명에게 발송", tomorrowEvents.size(), totalSentCount);
    }
}