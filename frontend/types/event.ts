// frontend/types/event.ts (백엔드 EventCategory enum과 동기화)
export type EventCategory =
  | 'FESTIVAL'
  | 'EXHIBITION'
  | 'PERFORMANCE'
  | 'EXPERIENCE_BOOTH'
  | 'FOOD_TRUCK'
  | 'TRAFFIC'
  | 'CONSTRUCTION'
  | 'ETC';

export type EventScale =
  | 'CITY'
  | 'UNIVERSITY'
  | 'DEPARTMENT'
  | 'CLUB'
  | 'PERSONAL';

export interface Event {
  id: string;
  title: string;
  category: EventCategory;
  scale: EventScale;
  startAt: string; // ISO string
  endAt: string;   // ISO string
  latitude: number;
  longitude: number;
  address: string;
  placeName: string;
  /** 지역명 (서울, 충북 충주 등) — 현재 위치 지역 필터용 */
  regionName?: string;
  thumbnailUrl?: string;
  isBookmarked?: boolean;
  /** 좋아요 수 (지도 인기순 목록 표시용) */
  likeCount?: number;
  /** 축제 구역 다각형 JSON 문자열 ([{"lat":36.99,"lng":127.92},...]) - null이면 반경 200m 원형 */
  zonePolygon?: string | null;
}

/** 소식 한 건 (extraJson 내 news[]) */
export interface EventNewsItem {
  id: string;
  title: string;
  body: string;
  date: string;
  /** 첨부 이미지 URL 목록 (없으면 undefined 또는 빈 배열) */
  imageUrls?: string[];
}

/** 타임테이블 한 건 (extraJson 내 timeline[]) */
export interface PerformerItem {
  name: string;
  genre: string;
  setlist: string[];
}

export interface EventTimelineItem {
  id: string;
  dateLabel?: string;
  startTime: string;
  endTime?: string;
  title: string;
  location?: string;
  details?: string[];
  performers?: PerformerItem[];
}

/** 부스 한 건 (extraJson 내 foodBooths / experienceBooths) */
export interface EventBoothItem {
  id: string;
  name: string;
  locationLabel?: string;
  type: 'food' | 'experience';
  time?: string;
  host?: string;
  menu?: string[];
  description?: string;
  rules?: string[];
  prizes?: string[];
  /** 푸드트럭/부스 외부 링크 (예: 인스타, 예약 페이지) */
  externalLink?: string;
}

/** 푸드트럭/체험부스 영역 위치 (위치 보기 지도용) */
export interface BoothAreaLocation {
  latitude: number;
  longitude: number;
}

/** 상세 탭용 저장 데이터 (extraJson 파싱 결과) */
export interface EventExtra {
  news?: EventNewsItem[];
  timeline?: EventTimelineItem[];
  foodBooths?: EventBoothItem[];
  experienceBooths?: EventBoothItem[];
  /** 푸드트럭 영역 중심 (위치 보기 지도) */
  foodArea?: BoothAreaLocation;
  /** 체험부스 영역 중심 (위치 보기 지도) */
  experienceArea?: BoothAreaLocation;
}

/** 이벤트 상세 (GET /api/events/{id} 응답) */
export interface EventDetail {
  id: number;
  title: string;
  /** 등록 시 선택한 대표 썸네일(포스터) — 목록/지도/상세 공통 사용 */
  thumbnailUrl?: string | null;
  posterUrls: string[];
  startAt: string;
  endAt: string;
  placeName: string | null;
  placeAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  categories: string[];
  hostContact: string | null;
  status: string;
  naverMapUrl: string | null;
  /** 소식/타임테이블/부스 JSON - 파싱해 탭에서 사용 */
  extraJson?: string | null;
  /** 좋아요 수 (백엔드) */
  likeCount?: number;
  /** 현재 사용자 좋아요 여부 */
  isLiked?: boolean;
  /** 현재 사용자 저장(스크랩) 여부 - 본인 계정에서만 true */
  isBookmarked?: boolean;
}
