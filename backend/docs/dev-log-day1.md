@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventRepository eventRepository;
    
    // 전체 조회
    @GetMapping
    public List<Event> getAllEvents() {
        return eventRepository.findAll();
    }
    
    // 1개 조회
    @GetMapping("/{id}")
    public Event getEvent(@PathVariable Long id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("행사를 찾을 수 없습니다"));
    }
    
    // 생성
    @PostMapping
    public Event createEvent(@RequestBody Event event) {
        return eventRepository.save(event);
    }
    
    // 삭제
    @DeleteMapping("/{id}")
    public String deleteEvent(@PathVariable Long id) {
        eventRepository.deleteById(id);
        return "삭제 완료";
    }
}
```

**Postman 테스트 시나리오**:
1. **POST** `http://localhost:8080/api/events` → 행사 생성
2. **GET** `http://localhost:8080/api/events` → 전체 조회
3. **GET** `http://localhost:8080/api/events/1` → 1번 행사 조회
4. **DELETE** `http://localhost:8080/api/events/1` → 1번 행사 삭제

**예상 리스크**:
- ⚠️ JSON 날짜 형식: `"startDate": "2025-05-01T10:00:00"` (ISO-8601 형식 필수)
- ⚠️ `@RequiredArgsConstructor` 사용 시 Lombok 플러그인 필요

---

## 🔍 점검 리스트 (실수 가능성 체크)

### ⚠️ 현재 설정에서 주의할 점

| 항목 | 현재 설정 | 리스크 | 해결 방법 |
|------|-----------|--------|-----------|
| **ddl-auto** | `update` | 프로덕션에서 절대 사용 금지 | 나중에 `validate` 또는 Flyway로 전환 |
| **비밀번호 노출** | `application.properties`에 평문 저장 | Git에 올리면 보안 사고 | `.gitignore`에 추가 또는 환경변수 사용 |
| **show-sql** | `true` | 프로덕션에서 성능 저하 | 개발 끝나면 `false`로 변경 |
| **MySQL 문자셋** | `characterEncoding=UTF-8` 설정함 | 설정 안 하면 한글 깨짐 | ✅ 현재 올바름 |
| **시간대** | `serverTimezone=Asia/Seoul` | 설정 안 하면 에러 | ✅ 현재 올바름 |
| **Lombok** | `build.gradle`에 추가함 | IntelliJ 플러그인 필요 | IntelliJ에서 Lombok 플러그인 설치 필요 시 |

---

### 📌 내일 시작 전 확인사항

**체크리스트**:
- [ ] MySQL 서버 실행 중인지 확인 (`brew services list` 또는 시스템 환경설정)
- [ ] IntelliJ에서 프로젝트 열기
- [ ] `BackendApplication.java` 실행해서 서버 정상 작동 확인
- [ ] 브라우저에서 `localhost:8080/hello` 접속 → 응답 정상 확인
- [ ] Postman 실행 준비

---

## 📚 추가 학습 자료 (선택)

### 오늘 내용 복습용
1. **Spring Boot 공식 가이드** (한글): https://spring.io/guides/gs/spring-boot/
2. **JPA 기초 개념** (30분 영상): 김영한 - 자바 ORM 표준 JPA 프로그래밍 (유튜브)
3. **3-Layer Architecture 설명**: https://www.baeldung.com/cs/layered-architecture

### 내일 미리 보기
1. **Lombok 사용법**: https://projectlombok.org/features/
2. **JPA Entity 어노테이션**: `@Entity`, `@Table`, `@Column`, `@GeneratedValue`

---

## 🎉 오늘의 성과

- ✅ 개발 환경 완벽 구축
- ✅ Spring Boot 프로젝트 생성 및 실행
- ✅ MySQL 연결 성공
- ✅ 첫 REST API 구현 및 테스트
- ✅ Spring 핵심 개념 이해 (DI, Bean, Controller, JPA)


```
