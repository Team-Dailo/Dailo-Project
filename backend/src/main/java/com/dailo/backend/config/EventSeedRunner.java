package com.dailo.backend.config;

import com.dailo.backend.domain.enums.EventCategory;
import com.dailo.backend.domain.enums.EventStatus;
import com.dailo.backend.entity.Event;
import com.dailo.backend.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 앱 기동 시 한국교통대·건국대 충주캠퍼스 기준 시드 행사 3건을 등록합니다.
 * 이전에 등록된 대축제/소축제 시드는 기동 시 삭제 후, 새 3건이 없을 때만 삽입합니다.
 */
@Slf4j
@Order(Integer.MAX_VALUE)
@Component
@RequiredArgsConstructor
public class EventSeedRunner implements ApplicationRunner {

    private static final List<String> OLD_SEED_TITLES = List.of(
            "2025 대축제",
            "봄 소축제 - 동아리 연합"
    );

    private final EventRepository eventRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        // 이전 시드(대축제/소축제) 삭제
        List<Event> toRemove = eventRepository.findByTitleIn(OLD_SEED_TITLES);
        toRemove.forEach(eventRepository::delete);
        if (!toRemove.isEmpty()) {
            log.info("이전 시드 데이터 삭제: {} 건", toRemove.size());
        }

        // 한국교통대·건국대 충주 기준 행사 3건 (없을 때만 삽입)
        if (!eventRepository.existsByTitleContaining("한국교통대 대축제")) {
            eventRepository.save(buildKnutDaechukje());
            log.info("시드 데이터 저장: 한국교통대 대축제");
        }
        if (!eventRepository.existsByTitleContaining("한국교통대 봄 소축제")) {
            eventRepository.save(buildKnutSochukje());
            log.info("시드 데이터 저장: 한국교통대 봄 소축제");
        }
        if (!eventRepository.existsByTitleContaining("건국대 충주캠퍼스 축제")) {
            eventRepository.save(buildKkuChungjuFestival());
            log.info("시드 데이터 저장: 건국대 충주캠퍼스 축제");
        }
        if (!eventRepository.existsByTitleContaining("충주시 축제 중앙탑")) {
            eventRepository.save(buildChungjuJungangtapEvent());
            log.info("시드 데이터 저장: 충주시 축제 중앙탑 행사");
        }
        // 2.20 다양한 카테고리 행사 3건
        if (!eventRepository.existsByTitleContaining("충주 시민 미술 전시")) {
            eventRepository.save(buildChungjuArtExhibition());
            log.info("시드 데이터 저장: 충주 시민 미술 전시");
        }
        if (!eventRepository.existsByTitleContaining("금요일 라이브 공연")) {
            eventRepository.save(buildFridayLivePerformance());
            log.info("시드 데이터 저장: 금요일 라이브 공연");
        }
        if (!eventRepository.existsByTitleContaining("주말 푸드트럭 페스타")) {
            eventRepository.save(buildWeekendFoodTruckFesta());
            log.info("시드 데이터 저장: 주말 푸드트럭 페스타");
        }
    }

    /** 한국교통대학교 충주캠퍼스 - 대축제 */
    private Event buildKnutDaechukje() {
        LocalDateTime start = LocalDateTime.now().plusDays(10).withHour(10).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime end = start.plusDays(2).withHour(22).withMinute(0).withSecond(0).withNano(0);
        return Event.builder()
                .title("한국교통대 대축제")
                .regionName("충북 충주")
                .filterGroup("UNIVERSITY")
                .placeName("한국교통대학교 충주캠퍼스 일원")
                .placeAddress("충청북도 충주시 대소원면 대학로 50")
                .latitude(36.9115)
                .longitude(127.8072)
                .startAt(start)
                .endAt(end)
                .thumbnailUrl("https://picsum.photos/seed/knut-dae/400/300")
                .categories(List.of(EventCategory.FESTIVAL))
                .status(EventStatus.ACTIVE)
                .posterUrls(List.of())
                .description("한국교통대학교 충주캠퍼스 대축제입니다. 메인 무대, 동아리 부스, 푸드트럭, 체험 부스가 준비되어 있습니다.")
                .hostContact("043-718-2000")
                .isAdminManaged(true)
                .build();
    }

    /** 한국교통대학교 충주캠퍼스 - 봄 소축제 */
    private Event buildKnutSochukje() {
        LocalDateTime start = LocalDateTime.now().plusDays(21).withHour(14).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime end = start.plusHours(6);
        return Event.builder()
                .title("한국교통대 봄 소축제")
                .regionName("충북 충주")
                .filterGroup("CLUB")
                .placeName("한국교통대학교 학생광장")
                .placeAddress("충청북도 충주시 대소원면 대학로 50")
                .latitude(36.9118)
                .longitude(127.8070)
                .startAt(start)
                .endAt(end)
                .thumbnailUrl("https://picsum.photos/seed/knut-so/400/300")
                .categories(List.of(EventCategory.FESTIVAL))
                .status(EventStatus.ACTIVE)
                .posterUrls(List.of())
                .description("한국교통대 동아리 연합 봄 소축제. 버스킹, 체험 부스, 간식 나눔 등이 진행됩니다.")
                .hostContact("한국교통대 학생회 043-718-2XXX")
                .isAdminManaged(true)
                .build();
    }

    /** 건국대학교 글로컬캠퍼스(충주) - 축제 */
    private Event buildKkuChungjuFestival() {
        LocalDateTime start = LocalDateTime.now().plusDays(14).withHour(11).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime end = start.plusDays(1).withHour(21).withMinute(0).withSecond(0).withNano(0);
        return Event.builder()
                .title("건국대 충주캠퍼스 축제")
                .regionName("충북 충주")
                .filterGroup("UNIVERSITY")
                .placeName("건국대학교 글로컬캠퍼스")
                .placeAddress("충청북도 충주시 충주대학로 268")
                .latitude(36.9704)
                .longitude(127.9322)
                .startAt(start)
                .endAt(end)
                .thumbnailUrl("https://picsum.photos/seed/kku-chungju/400/300")
                .categories(List.of(EventCategory.FESTIVAL))
                .status(EventStatus.ACTIVE)
                .posterUrls(List.of())
                .description("건국대학교 글로컬캠퍼스(충주) 축제입니다. 공연, 부스, 이벤트가 준비되어 있습니다.")
                .hostContact("043-840-3114")
                .isAdminManaged(true)
                .build();
    }

    /** 충주시 축제 - 중앙탑에서 열리는 행사 */
    private Event buildChungjuJungangtapEvent() {
        LocalDateTime start = LocalDateTime.now().plusDays(7).withHour(10).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime end = start.plusDays(1).withHour(20).withMinute(0).withSecond(0).withNano(0);
        return Event.builder()
                .title("충주시 축제 중앙탑 행사")
                .regionName("충북 충주")
                .filterGroup("CHUNGJU_CITY")
                .placeName("충주 중앙탑사적공원")
                .placeAddress("충청북도 충주시 중앙탑면 탑정안길 6")
                .latitude(36.6352)
                .longitude(127.4897)
                .startAt(start)
                .endAt(end)
                .thumbnailUrl("https://picsum.photos/seed/chungju-jungangtap/400/300")
                .categories(List.of(EventCategory.FESTIVAL))
                .status(EventStatus.ACTIVE)
                .posterUrls(List.of())
                .description("충주시 축제의 중앙탑 행사입니다. 중앙탑사적공원에서 다양한 공연과 부스가 준비되어 있습니다.")
                .hostContact("충주시청 043-850-5000")
                .isAdminManaged(true)
                .build();
    }

    /** 2.20 전시 - 충주 시민 미술 전시 */
    private Event buildChungjuArtExhibition() {
        LocalDateTime start = LocalDateTime.of(2026, 2, 20, 9, 0, 0);
        LocalDateTime end = LocalDateTime.of(2026, 2, 22, 18, 0, 0);
        return Event.builder()
                .title("충주 시민 미술 전시")
                .regionName("충북 충주")
                .filterGroup("CHUNGJU_CITY")
                .placeName("충주시립미술관")
                .placeAddress("충청북도 충주시 중앙탑면 탑정안길 6")
                .latitude(36.6340)
                .longitude(127.4900)
                .startAt(start)
                .endAt(end)
                .thumbnailUrl("https://picsum.photos/seed/chungju-art/400/300")
                .categories(List.of(EventCategory.EXHIBITION))
                .status(EventStatus.ACTIVE)
                .posterUrls(List.of())
                .description("충주 시민 작가들의 미술 전시회. 회화, 조소, 사진 등 다양한 작품을 만나보세요.")
                .hostContact("충주시립미술관 043-850-3XXX")
                .isAdminManaged(true)
                .build();
    }

    /** 2.20 공연 - 금요일 라이브 공연 */
    private Event buildFridayLivePerformance() {
        LocalDateTime start = LocalDateTime.of(2026, 2, 20, 19, 0, 0);
        LocalDateTime end = LocalDateTime.of(2026, 2, 20, 22, 0, 0);
        return Event.builder()
                .title("금요일 라이브 공연")
                .regionName("충북 충주")
                .filterGroup("CLUB")
                .placeName("건국대 글로컬캠퍼스 중앙광장")
                .placeAddress("충청북도 충주시 충주대학로 268")
                .latitude(36.9705)
                .longitude(127.9320)
                .startAt(start)
                .endAt(end)
                .thumbnailUrl("https://picsum.photos/seed/live-performance/400/300")
                .categories(List.of(EventCategory.PERFORMANCE))
                .status(EventStatus.ACTIVE)
                .posterUrls(List.of())
                .description("동아리 밴드와 뮤지션들의 금요일 저녁 라이브 공연. 무료 관람.")
                .hostContact("건국대 동아리연합회")
                .isAdminManaged(true)
                .build();
    }

    /** 2.20 푸드트럭 - 주말 푸드트럭 페스타 (개인 = 파란색) */
    private Event buildWeekendFoodTruckFesta() {
        LocalDateTime start = LocalDateTime.of(2026, 2, 20, 11, 0, 0);
        LocalDateTime end = LocalDateTime.of(2026, 2, 21, 20, 0, 0);
        return Event.builder()
                .title("주말 푸드트럭 페스타")
                .regionName("충북 충주")
                .filterGroup("")
                .placeName("충주 호반 씨네마 앞 광장")
                .placeAddress("충청북도 충주시 호반로 123")
                .latitude(36.9910)
                .longitude(127.9260)
                .startAt(start)
                .endAt(end)
                .thumbnailUrl("https://picsum.photos/seed/foodtruck/400/300")
                .categories(List.of(EventCategory.FOOD_TRUCK))
                .status(EventStatus.ACTIVE)
                .posterUrls(List.of())
                .description("다양한 푸드트럭이 모이는 주말 페스타. 타코, 버거, 디저트, 음료 등 맛집 트럭을 만나보세요.")
                .hostContact("충주시 상인회 043-8XX-XXXX")
                .isAdminManaged(true)
                .build();
    }
}
