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
}

/** 소식 한 건 (extraJson 내 news[]) */
export interface EventNewsItem {
  id: string;
  title: string;
  body: string;
  date: string;
}

/** 타임테이블 한 건 (extraJson 내 timeline[]) */
export interface EventTimelineItem {
  id: string;
  dateLabel?: string;
  startTime: string;
  endTime?: string;
  title: string;
  location?: string;
  details?: string[];
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
}

/** 상세 탭용 저장 데이터 (extraJson 파싱 결과) */
export interface EventExtra {
  news?: EventNewsItem[];
  timeline?: EventTimelineItem[];
  foodBooths?: EventBoothItem[];
  experienceBooths?: EventBoothItem[];
}

/** 이벤트 상세 (GET /api/events/{id} 응답) */
export interface EventDetail {
  id: number;
  title: string;
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
}
