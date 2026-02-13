package com.dailo.backend.service;

import com.dailo.backend.entity.Event;
import com.dailo.backend.repository.ClickLogRepository;
import com.dailo.backend.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 이벤트 viewCount7d, viewCount30d 갱신 (클릭 로그 집계).
 * 스케줄러에서 주기적으로 호출하여 "지금 뜨는 축제" / "조회수 많은 순" 정렬에 사용.
 */
@Service
@RequiredArgsConstructor
public class EventViewCountUpdateService {

    private final EventRepository eventRepository;
    private final ClickLogRepository clickLogRepository;

    @Transactional
    public void updateViewCounts() {
        LocalDateTime since7d = LocalDateTime.now().minusDays(7);
        LocalDateTime since30d = LocalDateTime.now().minusDays(30);

        Map<Long, Long> count7d = clickLogRepository.findClickCountsByEventSince(since7d).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> ((Number) row[1]).longValue()));
        Map<Long, Long> count30d = clickLogRepository.findClickCountsByEventSince(since30d).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> ((Number) row[1]).longValue()));

        List<Event> all = eventRepository.findAll();
        for (Event e : all) {
            e.setViewCount7d(count7d.getOrDefault(e.getId(), 0L).intValue());
            e.setViewCount30d(count30d.getOrDefault(e.getId(), 0L).intValue());
        }
        eventRepository.saveAll(all);
    }
}
