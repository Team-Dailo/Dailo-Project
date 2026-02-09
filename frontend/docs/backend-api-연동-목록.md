# 백엔드 API 연동 목록

## 1. 게시판 탭에서 연결해야 하는 백엔드

게시판 관련 화면: **게시판 목록**, **게시물 상세**, **게시물 작성**, **공지사항**  
현재 프론트: `board.service.ts`, `useBoard.ts` **비어 있음** → 목록/상세/작성 모두 **목업** 사용 중.

### 1) 게시글 (Post) – `PostController` (`/api/posts`)

| 용도 | 메서드 | 경로 | 비고 |
|------|--------|------|------|
| 게시글 목록 (전체) | GET | `/api/posts?page=0&size=20&sort=createdAt&direction=DESC` | 헤더 `X-User-Id` (선택) |
| 카테고리별 목록 | GET | `/api/posts/category/{categoryType}?page=0&size=20` | 후기/질문/자유 등 |
| 검색 | GET | `/api/posts/search?keyword=...&page=0&size=20` | |
| 게시글 상세 | GET | `/api/posts/{id}` | |
| 게시글 작성 | POST | `/api/posts` | Body: `PostRequestDto` (title, content, categoryType), 헤더 `X-User-Id` |
| 게시글 수정 | PUT | `/api/posts/{id}` | Body: `PostRequestDto` |
| 게시글 삭제 | DELETE | `/api/posts/{id}` | 헤더 `X-User-Id` |

- **PostListResponseDto**: id, authorId, title, categoryType, viewCount, likeCount, commentCount, createdAt  
- **PostResponseDto**: 위 + content, status, updatedAt  
- **PostRequestDto**: title, content, categoryType  

### 2) 댓글 (Comment) – `CommentController` (`/api`)

| 용도 | 메서드 | 경로 | 비고 |
|------|--------|------|------|
| 댓글 목록 | GET | `/api/posts/{postId}/comments?page=0&size=20` | 헤더 `X-User-Id` (선택) |
| 댓글 작성 | POST | `/api/posts/{postId}/comments` | Body: `CommentRequestDto` (content, parentCommentId), 헤더 `X-User-Id` |
| 댓글 수정 | PUT | `/api/comments/{id}` | Body: `CommentRequestDto` |
| 댓글 삭제 | DELETE | `/api/comments/{id}` | 헤더 `X-User-Id` |

- **CommentResponseDto**: id, postId, parentCommentId, authorId, content, likeCount, createdAt, updatedAt, replies  
- **CommentRequestDto**: content, parentCommentId (대댓글 시)  

### 3) 게시판에서 쓰는 다른 API (선택)

- **신고**: 게시물/댓글 신고 → `ReportController`  
  - `POST /api/reports` (Body: ReportRequestDto, 헤더 `X-User-Id`)
- **차단**: 게시물 더보기 메뉴의 “차단하기” → `BlockController`  
  - `POST /api/blocks` (Body: BlockRequestDto { blockedId }), `DELETE /api/blocks/{blockedId}`

---

## 2. 게시판 탭이 아니지만 연결해야 하는 것들

### 1) 인증 (Auth) – 로그인/회원가입

- **AuthController** (`/api/auth`)
  - `POST /api/auth/signup` – 회원가입 (MemberRequestDto)
  - `POST /api/auth/login` – 로그인 (LoginRequestDto) → TokenDto (JWT)
- 프론트: `auth.service.ts` **비어 있음** → 로그인 화면 연동 필요.

### 2) 이벤트 (홈 / 지도 / 검색 / 캘린더)

- **EventController** (`/api/events`)
  - `GET /api/events` – 리스트 (페이징, EventListRequest)
  - `GET /api/events/map?swLat=&neLat=&swLng=&neLng=` – 지도 마커용
  - `GET /api/events/calendar?year=&month=` – 캘린더 월별
  - `GET /api/events/{id}` – 이벤트 상세
- 프론트: `event.service.ts`에 **일부만 연동됨** (목록 `GET /api/events`).  
  지도/홈/검색/캘린더는 `MOCK_EVENTS` 또는 mock 사용 중 → **event.service + useEvent/useMap 등에서 위 API 전부 연동 필요**.

### 3) 채팅 (채팅 목록 / 채팅방)

- **ChatRoomController** (`/api/chat/rooms`)
  - `GET /api/chat/rooms` – 내 채팅방 목록 (헤더 `X-User-Id`)
  - `POST /api/chat/rooms` – 채팅방 생성 (Body: ChatRoomRequestDto { targetUserId })
  - `GET /api/chat/rooms/{roomId}` – 채팅방 상세
  - `DELETE /api/chat/rooms/{roomId}` – 채팅방 나가기
- **ChatMessageController** (REST)
  - `GET /api/chat/rooms/{roomId}/messages?page=0&size=50` – 메시지 히스토리
- **ChatController** (WebSocket/STOMP)
  - 메시지 전송: STOMP `MessageMapping("/chat/{roomId}")` → 저장 후 `/topic/chat/{roomId}` 로 브로드캐스트
- 프론트: 채팅 목록/채팅방 모두 **목업** → REST + STOMP 연동 필요.

### 4) 스크랩(찜) – 이벤트 상세 / 마이페이지

- **ScrapController** (`/api/scraps`)
  - `POST /api/scraps/{eventId}` – 스크랩 토글 (인증 필요)
  - `GET /api/scraps` – 내 스크랩 목록 (페이징)
- 프론트: 이벤트 상세 북마크/찜, 마이페이지 “찜한 행사” 등에서 연동 필요.

### 5) 로그 (검색/클릭) – 검색 탭, 통계 등

- **LogController** (`/api/logs`)
  - `POST /api/logs/search` – 검색 로그 → **연동됨** (검색 화면 제출 시 log.service)
  - `GET /api/logs/search/top` – 인기 검색어 → **연동됨** (검색 화면 인기 검색어)
  - `POST /api/logs/click` – 클릭 로그 → **연동됨** (이벤트 상세 진입 시 useEventDetail)
  - `GET /api/logs/click/count/{eventId}` – 이벤트별 클릭 수 (log.service 제공, 필요 시 UI 연동)
  - `GET /api/logs/click/top` – 인기 클릭 이벤트 (log.service 제공, 필요 시 UI 연동)

### 6) 기타

- **BlockController** (`/api/blocks`) – **연동됨** block.service, 게시물 더보기·채팅방 더보기에서 차단
- **ReportController** (`/api/reports`) – **연동됨** report.service, 게시물 더보기에서 신고
- **ChatRoomController, ChatMessageController** – **연동됨** chat.service, 채팅 목록/방/메시지 히스토리 (전송은 STOMP 별도 연동)

---

## 3. 요약

| 구분 | 연결 대상 | 프론트 상태 |
|------|-----------|-------------|
| **게시판** | PostController, CommentController, Report, Block | board.service 연동 완료 |
| **인증** | AuthController | auth.service 연동 완료 |
| **이벤트** | EventController (리스트/지도/캘린더/상세) | event.service 연동 완료 |
| **채팅** | ChatRoomController, ChatMessageController (REST) | chat.service 연동 완료 (메시지 전송은 STOMP 별도) |
| **스크랩** | ScrapController | scrap.service 연동 완료 |
| **로그** | LogController | log.service 연동 완료 (검색 로그, 인기 검색어, 클릭 로그) |

백엔드에는 위 API가 이미 구현되어 있으므로, 프론트에서는 `constants/api.ts`의 `API_BASE_URL`과 헤더(`X-User-Id` 또는 JWT)를 맞춘 뒤 각 서비스/훅에서 위 경로로 호출하면 됩니다.
