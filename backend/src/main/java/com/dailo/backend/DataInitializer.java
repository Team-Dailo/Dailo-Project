package com.dailo.backend;

import com.dailo.backend.entity.Event;
import com.dailo.backend.domain.enums.EventCategory;
import com.dailo.backend.domain.enums.EventStatus;
import com.dailo.backend.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final EventRepository eventRepository;

    @Override
    public void run(String... args) throws Exception {
        // 데이터가 없을 때만 생성
        if (eventRepository.count() > 0) return;

        System.out.println("====== [TEST] 임시 데이터를 생성합니다... ======");

        // 1. 축제 이벤트 (공개)
        Event event1 = Event.builder()
                .title("2026 충주 호수 축제")
                .description("충주 호수에서 열리는 멋진 불꽃놀이와 음악 축제입니다.")
                .placeName("충주 탄금대")
                .placeAddress("충청북도 충주시 칠금동")
                .latitude(36.982)
                .longitude(127.915)
                .startDateTime(LocalDateTime.now().plusDays(5)) // 5일 뒤 시작
                .endDateTime(LocalDateTime.now().plusDays(7))
                .status(EventStatus.PUBLISHED) // 공개 상태
                .categories(List.of(EventCategory.FESTIVAL)) // 카테고리: 축제
                .thumbnailUrl("https://via.placeholder.com/150") // 임시 이미지 URL
                .posterUrls(List.of("https://via.placeholder.com/600", "https://via.placeholder.com/600/2"))
                .build();

        // 2. 전시회 이벤트 (공개)
        Event event2 = Event.builder()
                .title("현대 미술 특별전")
                .description("지역 청년 작가들의 현대 미술 전시회")
                .placeName("충주 문화회관")
                .placeAddress("충청북도 충주시 성내동")
                .latitude(36.970)
                .longitude(127.930)
                .startDateTime(LocalDateTime.now().plusDays(10))
                .endDateTime(LocalDateTime.now().plusDays(20))
                .status(EventStatus.PUBLISHED)
                .categories(List.of(EventCategory.EXHIBITION)) // 카테고리: 전시
                .thumbnailUrl("https://via.placeholder.com/150")
                .build();

        // 3. 작성 중인 이벤트 (비공개 - DRAFT) -> 조회되면 안 됨!
        Event event3 = Event.builder()
                .title("비공개 기획안")
                .status(EventStatus.DRAFT) // 작성 중
                .startDateTime(LocalDateTime.now())
                .build();

        eventRepository.saveAll(List.of(event1, event2, event3));
        System.out.println("====== [TEST] 임시 데이터 생성 완료 ======");
    }
}