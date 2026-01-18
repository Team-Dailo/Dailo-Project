## Frontend 구조 (Expo Router)

### 1. 폴더 구조

```bash
frontend/
├── app/
│   ├── _layout.tsx              # 전체 Stack 네비게이션
│   ├── (tabs)/                  # Bottom Tabs 그룹
│   │   ├── _layout.tsx          # 탭 라우팅 정의
│   │   ├── home/index.tsx       # 홈 탭
│   │   ├── calendar/index.tsx   # 달력/행사 탭
│   │   ├── map/index.tsx        # 지도 탭
│   │   ├── board/index.tsx      # 게시판 탭
│   │   └── mypage/index.tsx     # 마이페이지 탭
│   ├── board/[id].tsx           # 게시글 상세
│   ├── board/chat.tsx           # 채팅
│   ├── board/write.tsx          # 글쓰기
│   ├── event/[id].tsx           # 행사 상세
│   ├── event/share.tsx          # 행사 공유
│   ├── login/index.tsx          # 로그인
│   ├── profile/index.tsx        # 프로필
│   └── settings/index.tsx       # 설정
├── components/                  # 재사용 UI 컴포넌트
├── constants/                   # 공통 상수
├── hooks/                       # 커스텀 훅
├── services/                    # API 통신 모듈
├── types/                       # 타입 정의
└── utils/                       # 공통 유틸 함수

## Development Environment

- Node.js: v20.12.2
- npm: v10.x
- Use `nvm use` before development
