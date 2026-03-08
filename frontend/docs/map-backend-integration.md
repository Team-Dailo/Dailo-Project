# 지도 화면 – 백엔드 연동 가이드

## 1. 지도에 뭘 써야 하나요?

- **지도 자체(타일/렌더링)**: 지도 SDK(예: `react-native-maps` → Google/Apple Maps)가 처리합니다. **백엔드에서 지도 이미지를 주는 게 아니라**, 프론트에서 SDK로 지도를 띄웁니다.
- **지도 위에 띄울 데이터**: **이벤트(축제) 목록 + 위도·경도**를 백엔드에서 가져와서, 프론트에서 **마커**로 표시합니다.

---

## 2. 백엔드에서 가져와야 하는 것

지도 탭에서 필요한 건 **“위치가 있는 이벤트 목록”** 한 번에 조회하는 API입니다.

### 2.1 필수로 필요한 필드

| 필드 | 용도 |
|------|------|
| `id` | 마커/카드 클릭 시 상세 이동, 시트 표시 |
| `title` | 마커·바텀시트 제목 |
| `latitude` | 지도 마커 위치 |
| `longitude` | 지도 마커 위치 |
| `placeName` | 장소명 (바텀시트·길찾기) |
| `placeAddress` 또는 `address` | 주소 (바텀시트·길찾기) |
| `startAt` / `startDateTime` | 행사 시작 (표시·필터) |
| `endAt` / `endDateTime` | 행사 종료 (표시·필터) |

- `latitude`, `longitude`가 **null이면** 그 이벤트는 지도에 마커를 찍지 않으면 됩니다.

### 2.2 있으면 좋은 필드

| 필드 | 용도 |
|------|------|
| `category` / `categories` | 필터(카테고리), 마커/카드 표시 |
| `scale` | 규모 필터·표시 (백엔드에 없으면 프론트에서 생략 가능) |
| `thumbnailUrl` | 리스트/카드 썸네일 |

---

## 3. 현재 백엔드 상태

- **Entity `Event`**: 이미 `latitude`, `longitude`, `placeName`, `placeAddress`, `startDateTime`, `endDateTime` 등 있음.
- **리스트 API** `GET /api/events`의 **`EventListResponse`**에는 **위도·경도·주소가 없음**  
  → 지도용으로는 **DTO에 위도·경도·주소를 추가**해 주면 됩니다.

---

## 4. 백엔드에서 할 일 (요약)

1. **`EventListResponse`에 필드 추가**
   - `Double latitude`
   - `Double longitude`
   - `String placeAddress`
   - (선택) `List<EventCategory> categories`
2. **`EventService.convertToEventListResponse()`**에서  
   `event.getLatitude()`, `event.getLongitude()`, `event.getPlaceAddress()`(, `event.getCategories()`) 넣어서 반환.

이렇게 하면 **기존 `GET /api/events`** 한 번으로  
- 리스트 화면
- 지도 화면(마커 + 바텀시트)

둘 다 같은 API로 처리할 수 있습니다.

(선택) 나중에 “지도 영역 안의 이벤트만” 조회하고 싶으면:
- `GET /api/events?minLat=37.4&maxLat=37.6&minLng=126.8&maxLng=127.2` 같은 **경계 박스 파라미터**를 추가해, 해당 영역 안의 이벤트만 반환하도록 할 수 있습니다.

---

## 5. 프론트엔드에서 할 일 (요약)

1. **API 호출**
   - 지도 탭에서 `GET /api/events` 호출 (페이지 크기 크게, 예: `size=100`).
   - 응답을 `Event` 타입으로 매핑할 때 `latitude`, `longitude`, `address`(placeAddress) 포함.
2. **지도 SDK**
   - `react-native-maps`의 `MapView` + `Marker` 사용.
   - `region`은 현재 위치 또는 기본 중심(서울 등).
   - `events` 배열을 돌면서 `latitude`, `longitude`가 있는 이벤트만 `Marker`로 표시.
3. **useMap**
   - `MOCK_EVENTS` 대신 위 API 결과를 사용하도록 변경.

---

## 6. 데이터 흐름 요약

```
[백엔드]
  GET /api/events
  → EventListResponse[] (id, title, latitude, longitude, placeName, placeAddress, startDateTime, endDateTime, …)

[프론트]
  useMap() 또는 map/event service
  → API 호출 → Event[] (latitude, longitude 필수)
  → MapView + Marker(events)
  → 마커 클릭 → selectedEvent → MapBottomSheet (작은 카드 / 큰 카드)
```

---

## 7. 프론트에서 API 쓰는 방법

- **`constants/api.ts`**: `API_BASE_URL` (기본 `http://localhost:8080`, 배포 시 `EXPO_PUBLIC_API_URL` 사용)
- **`services/event.service.ts`**: `getEventList()`, `getEventsForMap()` — `GET /api/events` 호출 후 프론트 `Event[]`로 변환 (지도는 lat/lng 있는 것만)
- **`hooks/useMap.ts`**: 현재 `MOCK_EVENTS` 사용. 백엔드 연동 시 `getEventsForMap()` 로 교체.
- **지도**: `react-native-maps`의 `MapView` + `Marker`에 `region`과 `events` 넘겨서 마커 표시.

정리하면, **백엔드에서는 “이벤트 리스트에 위도·경도·주소만 추가로 내려주면** 되고, **지도를 “띄우는” 건 프론트에서 지도 SDK로 하는 것**입니다.
