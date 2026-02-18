package com.dailo.backend.service;

import com.dailo.backend.domain.enums.EventCategory;
import com.dailo.backend.domain.enums.EventStatus;
import com.dailo.backend.entity.Event;
import com.dailo.backend.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
@RequiredArgsConstructor
public class FestivalCrawlerService {

    private final RestTemplate restTemplate;
    private final EventRepository eventRepository;

    @Value("${crawler.api.url:http://localhost:8000}")
    private String crawlerApiUrl;

    @Value("${crawler.api.year:2026}")
    private int crawlerYear;

    @Value("${crawler.api.region:충주시}")
    private String crawlerRegion;

    /**
     * AI 크롤러 API를 호출하여 축제 데이터를 가져오고 DB에 저장
     */
    @Transactional
    public int fetchAndSaveEvents() {
        log.info("축제 크롤링 시작: year={}, region={}", crawlerYear, crawlerRegion);

        // [개선] UriComponentsBuilder로 URL 인코딩 처리
        String url = UriComponentsBuilder.fromHttpUrl(crawlerApiUrl)
                .path("/get-festivals")
                .queryParam("year", crawlerYear)
                .queryParam("region", crawlerRegion)
                .build()
                .toUriString();

        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<>() {}
            );

            Map<String, Object> body = response.getBody();
            if (body == null || !body.containsKey("events")) {
                log.warn("크롤러 응답에 events가 없습니다.");
                return 0;
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> events = (List<Map<String, Object>>) body.get("events");

            int savedCount = 0;
            int skippedCount = 0;

            for (Map<String, Object> eventData : events) {
                try {
                    int result = saveEventIfNotExists(eventData);
                    if (result == 1) savedCount++;
                    else if (result == -1) skippedCount++;
                } catch (Exception e) {
                    log.error("이벤트 저장 실패: {}", eventData.get("행사명"), e);
                }
            }

            log.info("축제 크롤링 완료: 총 {}개 중 {}개 저장, {}개 스킵(날짜 파싱 실패)",
                    events.size(), savedCount, skippedCount);
            return savedCount;

        } catch (Exception e) {
            log.error("크롤러 API 호출 실패: {}", e.getMessage(), e);
            return 0;
        }
    }

    /**
     * 중복 체크 후 신규 이벤트만 저장
     * @return 1: 저장 성공, 0: 중복으로 스킵, -1: 날짜 파싱 실패로 스킵
     */
    private int saveEventIfNotExists(Map<String, Object> data) {
        String title = (String) data.get("행사명");
        String sourceUrl = (String) data.get("상세페이지");

        if (title == null || title.isBlank()) {
            return 0;
        }

        // [개선] 상세페이지 URL로 중복 체크 (더 정확함)
        if (sourceUrl != null && !sourceUrl.isBlank()) {
            if (eventRepository.existsBySourceUrl(sourceUrl)) {
                log.debug("이미 존재하는 행사 (URL 기준): {}", title);
                return 0;
            }
        } else {
            // sourceUrl이 없으면 제목으로 폴백
            if (eventRepository.existsByTitleContaining(title)) {
                log.debug("이미 존재하는 행사 (제목 기준): {}", title);
                return 0;
            }
        }

        // [개선] 날짜 파싱 - 실패 시 저장하지 않음
        String dateStr = (String) data.get("일시");
        LocalDateTime[] dates = parseDateRange(dateStr);

        if (dates == null) {
            log.warn("날짜 파싱 실패로 저장 스킵: {} (일시: {})", title, dateStr);
            return -1;
        }

        Event event = Event.builder()
                .title(title)
                .regionName((String) data.get("지역"))
                .placeName((String) data.get("장소"))
                .placeAddress((String) data.get("주소"))
                .thumbnailUrl((String) data.get("이미지"))
                .sourceUrl(sourceUrl)  // [개선] 원본 URL 저장
                .startAt(dates[0])
                .endAt(dates[1])
                .categories(List.of(EventCategory.FESTIVAL))
                .status(EventStatus.DRAFT)
                .filterGroup("CHUNGJU_CITY")
                .hostContact((String) data.get("주최/주관"))
                .build();

        eventRepository.save(event);
        log.info("신규 행사 저장: {}", title);
        return 1;
    }

    /**
     * 날짜 문자열 파싱
     * @return 파싱 성공 시 [시작일, 종료일], 실패 시 null
     */
    private LocalDateTime[] parseDateRange(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) {
            return null;  // [개선] 날짜 없으면 null 반환
        }

        try {
            // 패턴1: "2026.05.01 ~ 2026.05.03" 또는 "2026-05-01 ~ 2026-05-03"
            Pattern rangePattern = Pattern.compile(
                    "(\\d{4})[.\\-](\\d{1,2})[.\\-](\\d{1,2})\\s*~\\s*(\\d{4})[.\\-](\\d{1,2})[.\\-](\\d{1,2})");
            Matcher rangeMatcher = rangePattern.matcher(dateStr);
            if (rangeMatcher.find()) {
                LocalDateTime start = LocalDateTime.of(
                        Integer.parseInt(rangeMatcher.group(1)),
                        Integer.parseInt(rangeMatcher.group(2)),
                        Integer.parseInt(rangeMatcher.group(3)),
                        0, 0
                );
                LocalDateTime end = LocalDateTime.of(
                        Integer.parseInt(rangeMatcher.group(4)),
                        Integer.parseInt(rangeMatcher.group(5)),
                        Integer.parseInt(rangeMatcher.group(6)),
                        23, 59
                );
                return new LocalDateTime[]{start, end};
            }

            // 패턴2: "2026.05.01" 단일 날짜
            Pattern singlePattern = Pattern.compile("(\\d{4})[.\\-](\\d{1,2})[.\\-](\\d{1,2})");
            Matcher singleMatcher = singlePattern.matcher(dateStr);
            if (singleMatcher.find()) {
                LocalDateTime start = LocalDateTime.of(
                        Integer.parseInt(singleMatcher.group(1)),
                        Integer.parseInt(singleMatcher.group(2)),
                        Integer.parseInt(singleMatcher.group(3)),
                        0, 0
                );
                return new LocalDateTime[]{start, start.plusDays(1).minusMinutes(1)};
            }

            // 패턴3: "5월 1일 ~ 5월 3일" (연도 없음)
            Pattern monthDayPattern = Pattern.compile(
                    "(\\d{1,2})월\\s*(\\d{1,2})일\\s*~\\s*(\\d{1,2})월\\s*(\\d{1,2})일");
            Matcher monthDayMatcher = monthDayPattern.matcher(dateStr);
            if (monthDayMatcher.find()) {
                LocalDateTime start = LocalDateTime.of(
                        crawlerYear,
                        Integer.parseInt(monthDayMatcher.group(1)),
                        Integer.parseInt(monthDayMatcher.group(2)),
                        0, 0
                );
                LocalDateTime end = LocalDateTime.of(
                        crawlerYear,
                        Integer.parseInt(monthDayMatcher.group(3)),
                        Integer.parseInt(monthDayMatcher.group(4)),
                        23, 59
                );
                return new LocalDateTime[]{start, end};
            }

        } catch (Exception e) {
            log.warn("날짜 파싱 예외: {} - {}", dateStr, e.getMessage());
        }

        return null;  // [개선] 파싱 실패 시 null 반환
    }
}
