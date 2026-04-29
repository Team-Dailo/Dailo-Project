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
 * 앱 기동 시 한국교통대·건국대 충주캠퍼스 및 지역 축제 시드 데이터를 등록합니다.
 * 'Gate to YEOJEONG' 동아리 축제 데이터를 포함합니다.
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
        // 1. 이전 구버전 시드 데이터 삭제
        List<Event> toRemove = eventRepository.findByTitleIn(OLD_SEED_TITLES);
        toRemove.forEach(eventRepository::delete);
        if (!toRemove.isEmpty()) {
            log.info("이전 시드 데이터 삭제: {} 건", toRemove.size());
        }

        // 2. 신규 통합 축제: Gate to YEOJEONG (2026-04-30)
        // soft-delete 포함 전체에서 검색 → 있으면 복원 후 extraJson 갱신, 없으면 신규 등록
        eventRepository.findFirstByTitleContainingIgnoreDeleted("Gate to YEOJEONG").ifPresentOrElse(
            existing -> {
                if (existing.getDeletedAt() != null) {
                    eventRepository.restoreByIdNative(existing.getId());
                }
                existing.setExtraJson(buildGateToYeojeongFestival().getExtraJson());
                eventRepository.save(existing);
                log.info("시드 데이터 갱신: 국립한국교통대 동아리 축제 Gate to YEOJEONG (extraJson 업데이트)");
            },
            () -> {
                eventRepository.save(buildGateToYeojeongFestival());
                log.info("시드 데이터 저장: 국립한국교통대 동아리 축제 Gate to YEOJEONG");
            }
        );

        // 3. 기존 대학교 및 지역 시드 데이터 (soft-delete 포함 중복 확인 후 삽입)
        if (eventRepository.countByTitleContainingIgnoreDeleted("한국교통대 대축제") == 0) {
            eventRepository.save(buildKnutDaechukje());
            log.info("시드 데이터 저장: 한국교통대 대축제");
        }
        if (eventRepository.countByTitleContainingIgnoreDeleted("건국대 충주캠퍼스 축제") == 0) {
            eventRepository.save(buildKkuChungjuFestival());
            log.info("시드 데이터 저장: 건국대 충주캠퍼스 축제");
        }
        if (eventRepository.countByTitleContainingIgnoreDeleted("충주시 축제 중앙탑") == 0) {
            eventRepository.save(buildChungjuJungangtapEvent());
            log.info("시드 데이터 저장: 충주시 축제 중앙탑 행사");
        }
        if (eventRepository.countByTitleContainingIgnoreDeleted("충주 시민 미술 전시") == 0) {
            eventRepository.save(buildChungjuArtExhibition());
            log.info("시드 데이터 저장: 충주 시민 미술 전시");
        }
    }

    /** 국립한국교통대학교 충주캠퍼스 동아리 축제 - Gate to YEOJEONG (2026-04-30) */
    private Event buildGateToYeojeongFestival() {
        LocalDateTime start = LocalDateTime.of(2026, 4, 30, 11, 0, 0);
        LocalDateTime end = LocalDateTime.of(2026, 4, 30, 20, 0, 0);

        String description = "국립한국교통대학교 충주캠퍼스 동아리 축제 'Gate to YEOJEONG'입니다.\n"
                + "2026년 4월 30일(목) 한국교통대학교 학생광장 일원에서 열립니다.";

        String extraJson = "{"
            + "\"timeline\":["
            +   "{\"id\":\"t1\",\"startTime\":\"11:00\",\"endTime\":\"13:00\",\"title\":\"행사 준비 및 푸드트럭 운영 시작\"},"
            +   "{\"id\":\"t2\",\"startTime\":\"13:00\",\"endTime\":\"17:30\",\"title\":\"동아리 부스 운영\",\"details\":[\"체험 이벤트\",\"경품 증정\"]},"
            +   "{\"id\":\"t3\",\"startTime\":\"17:00\",\"endTime\":\"20:00\",\"title\":\"동아리 공연\","
            +   "\"performers\":["
            +     "{\"name\":\"포세이돈\",\"genre\":\"밴드\",\"startTime\":\"17:10\",\"setlist\":[\"Get your Gun - 브로큰발렌타인\",\"Ao to natsu - Mrs. Greenapple\",\"Poker Face - 브로큰발렌타인\"]},"
            +     "{\"name\":\"어울림\",\"genre\":\"밴드\",\"startTime\":\"17:27\",\"setlist\":[\"흔들리는 꽃들 속에서 네 샴푸향이 느껴진거야 - 장범준\",\"나에게로 떠나는 여행 - 버즈\",\"사랑 Two - YB\"]},"
            +     "{\"name\":\"소리담\",\"genre\":\"밴드\",\"startTime\":\"17:44\",\"setlist\":[\"Tokyo Inn - 혁오\",\"춤을 춰요 - 라쿠나\",\"Highlight - 터치드\"]},"
            +     "{\"name\":\"식스라인\",\"genre\":\"밴드\",\"startTime\":\"18:01\",\"setlist\":[\"Pain - 하현상\",\"금붕어 - 한로로\",\"See your eyes - 잔나비\",\"어리고 부끄럽고 바보 같은 - Xdinary Heroes\"]},"
            +     "{\"name\":\"신문고\",\"genre\":\"밴드\",\"startTime\":\"18:23\",\"setlist\":[\"데칼코마니 - 마마무\",\"Loveholic - 러브홀릭\",\"나에게로 떠나는 여행 - 버즈\"]},"
            +     "{\"name\":\"MUSE\",\"genre\":\"밴드\",\"startTime\":\"18:40\",\"setlist\":[\"antifreeze - 검정치마\",\"에잇 - 아이유\",\"우리의 꿈 - 코요태\"]},"
            +     "{\"name\":\"밴드 동아리 연합\",\"genre\":\"밴드 연합\",\"startTime\":\"18:57\",\"setlist\":[]},"
            +     "{\"name\":\"4D\",\"genre\":\"댄스\",\"startTime\":\"19:14\",\"setlist\":[\"내일에서 기다릴게 - 투모로우바이투게더\",\"404 - 키키\",\"할리우드 액션 - 보이넥스트도어\",\"아브라카타브라 - 미야오\",\"페이머스 - 올데이프로젝트\",\"퓨어허니 - 비욘세\",\"마음에 따라 뛰는건 멋지지않아 - 투어스\"]},"
            +     "{\"name\":\"피날레\",\"genre\":\"댄스\",\"startTime\":\"19:31\",\"setlist\":[\"THAT'S A NO NO - ITZY\",\"Loving U - 씨스타\",\"10 Minutes - 이효리\",\"다시 만난 오늘 - TWS\",\"ZOO - NCT & aespa\",\"Supersonic - fromis_9\",\"Friday Night - Young Gunz\",\"짧은 치마 - AOA\"]},"
            +     "{\"name\":\"바이탈싸인\",\"genre\":\"힙합/댄스\",\"startTime\":\"19:53\",\"setlist\":[\"Pubic Enemy VAXA remix\",\"404 - KiiiKiii\",\"Black swan VAXA remix\",\"Love me right - EXO\",\"으르렁 - EXO\",\"Final - VAXA\",\"Bad girl good girl - Miss A\",\"Bo peep Bo peep - 티아라\",\"Vital xignz up - VAXA\"]}"
            +   "]}"
            + "],"
            + "\"foodBooths\":["
            +   "{\"id\":\"f1\",\"name\":\"서우푸드\",\"type\":\"food\",\"time\":\"11:00~20:00\",\"menu\":[\"닭꼬치 5,000원\",\"닭똥집튀김 10,000원\",\"소떡소떡 4,000원\"]},"
            +   "{\"id\":\"f2\",\"name\":\"용타코\",\"type\":\"food\",\"time\":\"11:00~20:00\",\"menu\":[\"수제타코야끼(8알) 5,000원\",\"수제타코야끼(12알) 7,000원\",\"슬러시 3,000원\"]},"
            +   "{\"id\":\"f3\",\"name\":\"오감푸드\",\"type\":\"food\",\"time\":\"11:00~20:00\",\"menu\":[\"크림새우 10,000원\",\"칠리새우 10,000원\",\"반반새우 15,000원\"]},"
            +   "{\"id\":\"f4\",\"name\":\"쏘굿\",\"type\":\"food\",\"time\":\"11:00~20:00\",\"menu\":[\"크레페 7,000원\",\"아이스크림크레페 8,000원\"]},"
            +   "{\"id\":\"f5\",\"name\":\"써니푸드\",\"type\":\"food\",\"time\":\"11:00~20:00\",\"menu\":[\"닭강정(중) 10,000원\",\"닭강정(대) 17,000원\"]},"
            +   "{\"id\":\"f6\",\"name\":\"춘자곱창\",\"type\":\"food\",\"time\":\"11:00~20:00\",\"menu\":[\"곱창(소) 13,000원\",\"곱창(중) 18,000원\"]},"
            +   "{\"id\":\"f7\",\"name\":\"차군식당\",\"type\":\"food\",\"time\":\"11:00~20:00\",\"menu\":[\"스테이크(1인) 13,000원\",\"스테이크(2인) 23,000원\"]},"
            +   "{\"id\":\"f8\",\"name\":\"나드리\",\"type\":\"food\",\"time\":\"11:00~20:00\",\"menu\":[\"야끼소바 10,000원\",\"오코노미야끼 10,000원\"]},"
            +   "{\"id\":\"f9\",\"name\":\"윤셰프\",\"type\":\"food\",\"time\":\"11:00~20:00\",\"menu\":[\"츄러스 4,000원\",\"아이스크림츄러스 6,000원\"]},"
            +   "{\"id\":\"f10\",\"name\":\"인생컴퍼니\",\"type\":\"food\",\"time\":\"11:00~20:00\",\"menu\":[\"소고기직화초밥(10p) 12,000원\",\"새우직화초밥(10p) 12,000원\"]}"
            + "],"
            + "\"experienceBooths\":["
            +   "{\"id\":\"b1\",\"name\":\"PPC 패션동아리\",\"type\":\"experience\",\"time\":\"13:00~17:30\",\"description\":\"PPC 스타일 유형 진단, 비즈키링 만들기, 캔뱃지 제작\"},"
            +   "{\"id\":\"b2\",\"name\":\"CCC 기독교 동아리\",\"type\":\"experience\",\"time\":\"13:00~17:30\",\"description\":\"전통놀이 체험 (공기놀이, 제기차기, 딱지치기, 투호놀이)\",\"prizes\":[\"2개 성공 → 뽑기권 1장\",\"4개 모두 성공 → 뽑기권 2장\"]},"
            +   "{\"id\":\"b3\",\"name\":\"러빙 프렌즈\",\"type\":\"experience\",\"time\":\"13:00~17:30\",\"description\":\"제한 시간 내 망치로 지정된 위치에 못 박기 체험\",\"prizes\":[\"성공 여부에 따라 소정의 상품 제공\"]},"
            +   "{\"id\":\"b4\",\"name\":\"아가페 천주교 동아리\",\"type\":\"experience\",\"time\":\"13:00~17:30\",\"description\":\"세례명 정해보기, 기도 대신 해드림, 책갈피 만들기\"},"
            +   "{\"id\":\"b5\",\"name\":\"LUDENS 게임 동아리\",\"type\":\"experience\",\"time\":\"13:00~17:30\",\"description\":\"롤, 발로란트 캐릭터/맵 맞히기 게임 (난이도 선택 가능)\",\"prizes\":[\"결과에 따라 소정의 상품 제공\"]},"
            +   "{\"id\":\"b6\",\"name\":\"엘림찬양단\",\"type\":\"experience\",\"time\":\"13:00~17:30\",\"description\":\"성경인물 이모지 게임, 찬양 관련 퀴즈\",\"prizes\":[\"솜사탕 + 소정의 간식\"]},"
            +   "{\"id\":\"b7\",\"name\":\"총학생회\",\"type\":\"experience\",\"time\":\"13:00~17:30\",\"description\":\"총학생회 체험 부스\"},"
            +   "{\"id\":\"b8\",\"name\":\"오투 축구 동아리\",\"type\":\"experience\",\"time\":\"13:00~17:30\",\"description\":\"골대를 향해 슈팅 체험 + 축구선수 콘셉트 포토존\",\"prizes\":[\"목표 정확히 맞출 시 상품 제공\"]},"
            +   "{\"id\":\"b9\",\"name\":\"YOUTH&JCI\",\"type\":\"experience\",\"time\":\"13:00~17:30\",\"description\":\"행운을 나누는 한마디 (가챠 감성) - 행운부적에 좋은 말 작성 후 랜덤으로 뽑기\",\"prizes\":[\"참여 선물: 소정의 간식 + 행운의 부적\",\"인스타 팔로우 이벤트: 가챠 인형 증정\"]},"
            +   "{\"id\":\"b10\",\"name\":\"POLICE 방범대\",\"type\":\"experience\",\"time\":\"13:00~17:30\",\"description\":\"인형 사격게임\",\"prizes\":[\"성공 시 인형 증정\"]},"
            +   "{\"id\":\"b11\",\"name\":\"보드라이프\",\"type\":\"experience\",\"time\":\"13:00~17:30\",\"description\":\"보드게임 체험 3종: HUES AND CUES, 구룡투, 5초준다\",\"prizes\":[\"게임 성공 시 뽑기 추첨\"]},"
            +   "{\"id\":\"b12\",\"name\":\"사랑방 극 연구 예술회\",\"type\":\"experience\",\"time\":\"13:00~17:30\",\"description\":\"사랑방약국 - 감정 키워드를 통해 나만의 마음 약을 처방받는 체험 부스\"},"
            +   "{\"id\":\"b13\",\"name\":\"하비온\",\"type\":\"experience\",\"time\":\"13:00~17:30\",\"description\":\"감각 제한 미션(눈 가리고 맞추기), 일심동체 게임\",\"prizes\":[\"타투스티커, 야광팔찌, 소정의 간식\"]},"
            +   "{\"id\":\"b14\",\"name\":\"총동아리연합회 여정\",\"type\":\"experience\",\"time\":\"13:00~17:30\",\"description\":\"트래비를 이겨라(수도 맞추기), 랜덤 여행지 게임, 캐리어 무게 맞추기\",\"prizes\":[\"단계별 성공 시 차등 상품 지급\",\"실패 시 이전 보상 몰수\"]}"
            + "]}";

        return Event.builder()
                .title("한국교통대 동아리 축제 Gate to YEOJEONG")
                .regionName("충북 충주")
                .filterGroup("CLUB")
                .placeName("한국교통대학교 학생광장 일원")
                .placeAddress("충청북도 충주시 대소원면 대학로 50")
                .latitude(36.9118)
                .longitude(127.8070)
                .startAt(start)
                .endAt(end)
                .thumbnailUrl("https://picsum.photos/seed/yeojeong-2026/400/300")
                .categories(List.of(EventCategory.FESTIVAL, EventCategory.PERFORMANCE, EventCategory.FOOD_TRUCK))
                .status(EventStatus.ACTIVE)
                .description(description)
                .extraJson(extraJson)
                .hostContact("한국교통대 총동아리연합회")
                .isAdminManaged(true)
                .build();
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
                .description("한국교통대학교 메인 대축제입니다.")
                .hostContact("043-718-2000")
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
                .description("건국대학교 글로컬캠퍼스 축제입니다.")
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
                .description("충주시 주관 중앙탑 사적공원 행사입니다.")
                .hostContact("충주시청 043-850-5000")
                .isAdminManaged(true)
                .build();
    }

    /** 전시 - 충주 시민 미술 전시 */
    private Event buildChungjuArtExhibition() {
        LocalDateTime start = LocalDateTime.of(2026, 4, 20, 9, 0, 0);
        LocalDateTime end = LocalDateTime.of(2026, 4, 22, 18, 0, 0);
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
                .description("충주 시민 작가들의 미술 전시회입니다.")
                .hostContact("043-850-3XXX")
                .isAdminManaged(true)
                .build();
    }
}
