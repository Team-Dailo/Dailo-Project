dailo-project/frontend
├── .gitignore                 // Git이 추적하지 않을 파일/폴더 목록
├── .nvmrc                     // 이 프로젝트에 사용될 Node.js 버전 명시
├── app.json                   // Expo 앱의 전반적인 설정 (이름, 아이콘 등)
├── Dockerfile                 // Docker 컨테이너 빌드를 위한 설정 파일
├── eslint.config.js           // ESLint 코드 스타일 및 문법 검사 설정
├── package-lock.json          // 의존성 라이브러리들의 정확한 버전 고정
├── package.json               // 프로젝트 정보, 의존성, 실행 스크립트 정의
├── README.md                  // 프로젝트 설명서
├── tsconfig.json              // TypeScript 컴파일러 설정
├── .expo/                     // Expo 관련 설정 및 캐시
├── .vscode/                   // VS Code 에디터 관련 설정
├── app/                       // 화면 및 라우팅(경로) 관리
│   ├── _layout.tsx            // 앱의 전체적인 레이아웃 정의
│   ├── +not-found.tsx         // 존재하지 않는 경로 접근 시 보여줄 화면
│   ├── (tabs)/                // 하단 탭 내비게이션 그룹
│   │   ├── _layout.tsx        // 탭 그룹의 레이아웃 (탭 바 UI)
│   │   ├── board/             // '게시판' 탭 관련 파일
│   │   │   ├── index.tsx      // 게시판 메인 화면
│   │   │   └── _components/   // 게시판 탭에서만 사용하는 컴포넌트
│   │   │       ├── BoardCategoryChips.tsx // 카테고리 선택 칩
│   │   │       ├── BoardNoticeCard.tsx    // 공지사항 카드
│   │   │       ├── BoardPostCard.tsx      // 게시글 카드
│   │   │       ├── BoardSortTabs.tsx      // 정렬 방식 탭
│   │   │       └── FloatingWriteButton.tsx// 글쓰기 플로팅 버튼
│   │   ├── calendar/          // '캘린더' 탭 관련 파일
│   │   │   └── index.tsx      // 캘린더 메인 화면
│   │   ├── home/              // '홈' 탭 관련 파일
│   │   │   ├── _layout.tsx    // 홈 탭 내의 중첩된 화면 레이아웃
│   │   │   ├── event-list.tsx // 이벤트 목록 화면
│   │   │   └── index.tsx      // 홈 메인 화면
│   │   ├── map/               // '지도' 탭 관련 파일
│   │   │   ├── index.tsx      // 지도 메인 화면
│   │   │   └── _components/   // 지도 탭에서만 사용하는 컴포넌트
│   │   │       ├── FilterChips.tsx      // 필터 선택 칩
│   │   │       ├── FilterModals.tsx     // 필터 설정 모달
│   │   │       ├── FloatingButtons.tsx  // 지도 위 플로팅 버튼들
│   │   │       ├── MapBottomSheet.tsx   // 지도 하단 정보 시트
│   │   │       └── SideMenu.tsx         // 사이드 메뉴
│   │   └── mypage/            // '마이페이지' 탭 관련 파일
│   │       ├── _layout.tsx              // 마이페이지 탭 내 화면 레이아웃
│   │       ├── board-history.tsx        // 내가 쓴 글/댓글 내역 화면
│   │       ├── index.tsx                // 마이페이지 메인 화면
│   │       ├── lottery-ticket-list.tsx  // 응모권 목록 화면
│   │       ├── participated-festivals.tsx // 참여한 축제 목록 화면
│   │       ├── saved-booths.tsx         // 저장한 부스 목록 화면
│   │       ├── saved-festivals.tsx      // 저장한 축제 목록 화면
│   │       ├── settings.tsx             // 설정 화면
│   │       ├── stay-coupon-list.tsx     // 숙소 쿠폰 목록 화면
│   │       └── stay-mission-history.tsx // 숙소 미션 내역 화면
│   ├── board/                 // 게시판 상세 기능 관련 화면 (탭 외부)
│   │   ├── [id].tsx           // 특정 ID를 가진 게시글 상세 화면
│   │   ├── char-room.tsx      // 채팅방 화면 (※ chat-room 오타 가능)
│   │   ├── chat.tsx           // 채팅 목록 화면
│   │   └── write.tsx          // 게시글 작성 화면
│   ├── event/                 // 이벤트 상세 기능 관련 화면
│   │   ├── [id].tsx           // 특정 ID를 가진 이벤트 상세 화면
│   │   └── share.tsx          // 이벤트 공유 화면
│   ├── login/                 // 로그인/인증 관련 화면
│   │   └── index.tsx          // 로그인 메인 화면
│   ├── profile/               // 프로필 관련 화면
│   │   └── index.tsx          // 프로필 메인 화면
│   └── search/                // 검색 관련 화면
│       └── index.tsx          // 검색 메인 화면
├── components/                // 여러 화면에서 재사용되는 공통 컴포넌트
│   ├── card/                  // 카드 형태의 컴포넌트 모음
│   │   ├── BoothCard.tsx      // 부스 정보 카드
│   │   ├── EventCard.tsx      // 이벤트 정보 카드
│   │   └── PostCard.tsx       // 게시물 정보 카드
│   ├── common/                // 범용적으로 사용되는 기본 컴포넌트
│   │   ├── Badge.tsx          // 뱃지 컴포넌트
│   │   ├── BottomSheet.tsx    // 하단에서 올라오는 시트 컴포넌트
│   │   ├── Button.tsx         // 기본 버튼 컴포넌트
│   │   └── IconButton.tsx     // 아이콘 버튼 컴포넌트
│   └── detail/                // 상세 페이지에서 사용되는 컴포넌트
│       ├── BoothDetailModal.tsx // 부스 상세 정보 모달
│       ├── BoothMap.tsx        // 부스 위치를 보여주는 미니 맵
│       ├── EventBoothTab.tsx   // 이벤트 내 부스 목록 탭
│       ├── EventDetailHeader.tsx// 이벤트 상세 페이지 헤더
│       ├── EventDetailTabs.tsx // 이벤트 상세 페이지 탭
│       ├── EventNewsTab.tsx    // 이벤트 소식 탭
│       ├── MoreMenu.tsx        // '더보기' 메뉴
│       ├── NewsItem.tsx        // 개별 소식 항목
│       └── Timeline.tsx        // 타임라인 컴포넌트
├── constants/                 // 앱 전반에서 사용되는 고정 값(상수)
│   ├── api.ts                 // API 관련 상수 (주소 등)
│   ├── colors.ts              // 앱에서 사용하는 색상 값
│   ├── fonts.ts               // 폰트 관련 설정
│   ├── mockBoardPosts.ts      // 게시판 목업(테스트용 가짜) 데이터
│   ├── mockChats.ts           // 채팅 목업 데이터
│   ├── mockEvents.ts          // 이벤트 목업 데이터
│   └── spacing.ts             // 간격(여백) 관련 상수
├── hooks/                     // 반복되는 로직을 재사용하기 위한 커스텀 훅
│   ├── useAuth.ts             // 인증 관련 훅
│   ├── useBoard.ts            // 게시판 관련 훅
│   ├── useBottomSheet.ts      // 바텀시트 제어 훅
│   ├── useEvent.ts            // 이벤트 관련 훅
│   └── useMap.ts              // 지도 관련 훅
├── services/                  // 외부 API와 통신하는 로직
│   ├── auth.service.ts        // 인증(로그인 등) API 연동
│   ├── board.service.ts       // 게시판 API 연동
│   ├── event.service.ts       // 이벤트 API 연동
│   ├── map.service.ts         // 지도/장소 API 연동
│   └── user.service.ts        // 사용자 정보 API 연동
├── types/                     // 프로젝트에서 사용되는 TypeScript 타입 정의
│   ├── board.ts               // 게시판 관련 타입
│   ├── event.ts               // 이벤트 관련 타입
│   ├── map.ts                 // 지도 관련 타입
│   └── user.ts                // 사용자 관련 타입
└── utils/                     // 특정 도메인에 국한되지 않는 범용 헬퍼 함수
    ├── formatDate.ts          // 날짜 형식 변환 함수
    ├── formatTime.ts          // 시간 형식 변환 함수
    ├── logger.ts              // 로그 출력/관리 함수
    └── storage.ts             // 디바이스 저장소(AsyncStorage 등) 접근 함수
