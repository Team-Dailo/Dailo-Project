import { API_BASE_URL } from '../constants/api';
import { getAccessToken } from './auth.service';
import type { Event, EventDetail, EventScale } from '../types/event';

/** 백엔드 이벤트 리스트 응답 (EventListResponse: id, title, thumbnailUrl, startAt, endAt, placeName, regionName) */
type EventListResponseItem = {
  id: number;
  title: string;
  thumbnailUrl?: string | null;
  startAt?: string;
  endAt?: string;
  startDateTime?: string;
  endDateTime?: string;
  placeName?: string | null;
  placeAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  categories?: string[] | null;
  regionName?: string | null;
};

/** 백엔드 카테고리 → 프론트 표시용 (그대로 사용, 없으면 ETC) */
const mapCategory = (cat?: string | null): string => {
  return cat ?? 'ETC';
};

/** 백엔드 응답 → 프론트 Event (지도/리스트 공통) */
function toEvent(item: EventListResponseItem): Event {
  const category = item.categories?.[0]
    ? mapCategory(item.categories[0])
    : 'ETC';
  return {
    id: String(item.id),
    title: item.title,
    category,
    scale: 'UNIVERSITY', // 백엔드에 scale 없음 시 기본값
    startAt: item.startAt ?? item.startDateTime ?? '',
    endAt: item.endAt ?? item.endDateTime ?? '',
    latitude: item.latitude ?? 0,
    longitude: item.longitude ?? 0,
    address: item.placeAddress ?? '',
    placeName: item.placeName ?? '',
    thumbnailUrl: item.thumbnailUrl ?? undefined,
    isBookmarked: false,
    regionName: item.regionName ?? undefined,
  };
}

/** 페이지 응답 (Spring Page) */
type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
};

/**
 * 인기/추천 정렬: trending=지금 뜨는 축제(7일 조회수), views=조회수 많은 순(30일), popular=인기순(좋아요)
 */
export type EventListSort = 'trending' | 'views' | 'popular' | null;

/**
 * 이벤트 목록 조회 (리스트/지도 공통)
 * - region: 지역(주소 포함 검색)
 * - startAt, endAt: yyyy-MM-dd 날짜 범위 (해당 기간과 겹치는 행사)
 * - keyword: 행사명·장소명·내용(description) 기준 검색
 * - sort: trending(7일 조회수) | views(30일 조회수) | popular(좋아요) | null(기본 startAt)
 */
export async function getEventList(params?: {
  page?: number;
  size?: number;
  region?: string | null;
  startAt?: string | null; // yyyy-MM-dd
  endAt?: string | null;    // yyyy-MM-dd
  keyword?: string | null;
  sort?: EventListSort;
}): Promise<Event[]> {
  const page = params?.page ?? 1;
  const size = params?.size ?? 100;
  const region = params?.region?.trim();
  const startAt = params?.startAt?.trim();
  const endAt = params?.endAt?.trim();
  const keyword = params?.keyword?.trim();
  const sort = params?.sort ?? null;
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(page));
  searchParams.set('size', String(size));
  if (region) searchParams.set('region', region);
  if (startAt) searchParams.set('startAt', startAt);
  if (endAt) searchParams.set('endAt', endAt);
  if (keyword) searchParams.set('keyword', keyword);
  if (sort) searchParams.set('sort', sort);
  const url = `${API_BASE_URL}/api/events?${searchParams.toString()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`events list failed: ${res.status}`);
  const data: PageResponse<EventListResponseItem> = await res.json();
  return (data.content ?? []).map(toEvent);
}

/**
 * 위도·경도가 있는 이벤트만 반환 (지도 마커용)
 */
export async function getEventsForMap(params?: {
  page?: number;
  size?: number;
}): Promise<Event[]> {
  const list = await getEventList(params);
  return list.filter(
    (e) =>
      e.latitude != null &&
      e.longitude != null &&
      Number.isFinite(e.latitude) &&
      Number.isFinite(e.longitude)
  );
}

/** 캘린더 월별 API 응답 (EventCalendarResponse) */
export type CalendarEventItem = {
  id: number;
  title: string;
  category: string;
  /** 달력 필터 (충주시/대학교/총학생회/단과대/동아리) - 백엔드 enum명 예: CHUNGJU_CITY */
  filterGroup?: string | null;
  startAt: string;
  endAt: string;
  isBookmarked: boolean;
};

/**
 * 캘린더 월별 이벤트 조회
 * GET /api/events/calendar?year=2025&month=5
 */
export async function getCalendarEvents(
  year: number,
  month: number
): Promise<CalendarEventItem[]> {
  const url = `${API_BASE_URL}/api/events/calendar?year=${year}&month=${month}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`calendar events failed: ${res.status}`);
  const data: CalendarEventItem[] = await res.json();
  return data ?? [];
}

/**
 * 백엔드 LocalDateTime이 배열 [y,mo,d,h,min,s]로 올 수 있음 → ISO 문자열로 통일
 */
function toIsoDateString(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) {
    const [y, mo, d, h = 0, min = 0, s = 0] = v.map(Number);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return '';
    const month = mo - 1; // Java 1–12 → JS 0–11
    const date = new Date(y, month, d, h, min, s);
    return Number.isFinite(date.getTime()) ? date.toISOString() : '';
  }
  return '';
}

/** 백엔드 지도 마커 응답 (EventMapResponse) */
type EventMapResponseItem = {
  id: number;
  title: string;
  latitude: number | null;
  longitude: number | null;
  category: string;
  filterGroup?: string | null;
  thumbnailUrl: string | null;
  status?: string;
  startAt?: string | number[] | null;
  endAt?: string | number[] | null;
  placeName?: string | null;
  placeAddress?: string | null;
  regionName?: string | null;
  likeCount?: number | null;
  zonePolygon?: string | null;
};

function filterGroupToScale(fg: string | null | undefined): EventScale {
  if (!fg) return 'PERSONAL';
  switch (fg) {
    case 'CHUNGJU_CITY': return 'CITY';
    case 'UNIVERSITY': return 'UNIVERSITY';
    case 'COLLEGE':
    case 'STUDENT_COUNCIL': return 'DEPARTMENT';
    case 'CLUB': return 'CLUB';
    default: return 'PERSONAL';
  }
}

function eventMapItemToEvent(item: EventMapResponseItem): Event {
  return {
    id: String(item.id),
    title: item.title,
    category: mapCategory(item.category),
    scale: filterGroupToScale(item.filterGroup),
    startAt: toIsoDateString(item.startAt) || '',
    endAt: toIsoDateString(item.endAt) || '',
    latitude: item.latitude ?? 0,
    longitude: item.longitude ?? 0,
    address: item.placeAddress ?? '',
    placeName: item.placeName ?? '',
    regionName: item.regionName ?? undefined,
    thumbnailUrl: item.thumbnailUrl ?? undefined,
    isBookmarked: false,
    likeCount: item.likeCount ?? 0,
    zonePolygon: item.zonePolygon ?? null,
  };
}

/**
 * 지도 영역(bounds) 내 이벤트 마커 조회
 * GET /api/events/map?swLat=&neLat=&swLng=&neLng=
 */
export async function getEventsOnMap(params: {
  swLat: number;
  neLat: number;
  swLng: number;
  neLng: number;
}): Promise<Event[]> {
  const { swLat, neLat, swLng, neLng } = params;
  const url = `${API_BASE_URL}/api/events/map?swLat=${swLat}&neLat=${neLat}&swLng=${swLng}&neLng=${neLng}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`events map failed: ${res.status}`);
  const data: EventMapResponseItem[] = await res.json();
  const list = data ?? [];
  if (__DEV__) console.log('[Event API] map ok, count:', list.length);
  return list.map(eventMapItemToEvent);
}

/** 백엔드 상세 응답 (EventDetailResponse) - startAt/endAt은 ISO 문자열 또는 배열로 올 수 있음 */
type EventDetailResponseRaw = {
  id: number;
  title: string;
  thumbnailUrl?: string | null;
  posterUrls: string[] | null;
  startAt: string | number[];
  endAt: string | number[];
  placeName: string | null;
  placeAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  categories: string[];
  hostContact: string | null;
  status: string;
  naverMapUrl: string | null;
  extraJson?: string | null;
  likeCount?: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
};

/**
 * 이벤트 상세 조회 (로그인 시 isLiked 포함)
 * GET /api/events/{id}
 */
export async function getEventDetail(id: string): Promise<EventDetail> {
  const token = await getAccessToken().catch(() => null);
  const res = await fetch(`${API_BASE_URL}/api/events/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`event detail failed: ${res.status}`);
  const raw: EventDetailResponseRaw = await res.json();
  if (__DEV__) console.log('[Event API] detail ok:', raw?.id ?? id, 'extraJson:', raw?.extraJson ? 'present' : 'null');
  return {
    id: raw.id,
    title: raw.title,
    thumbnailUrl: raw.thumbnailUrl ?? null,
    posterUrls: raw.posterUrls ?? [],
    startAt: typeof raw.startAt === 'string' ? raw.startAt : toIsoDateString(raw.startAt),
    endAt: typeof raw.endAt === 'string' ? raw.endAt : toIsoDateString(raw.endAt),
    placeName: raw.placeName ?? null,
    placeAddress: raw.placeAddress ?? null,
    latitude: raw.latitude ?? null,
    longitude: raw.longitude ?? null,
    description: raw.description ?? null,
    categories: raw.categories ?? [],
    hostContact: raw.hostContact ?? null,
    status: raw.status ?? '',
    naverMapUrl: raw.naverMapUrl ?? null,
    extraJson: raw.extraJson ?? null,
    likeCount: raw.likeCount ?? 0,
    isLiked: raw.isLiked ?? false,
    isBookmarked: raw.isBookmarked ?? false,
  };
}

/**
 * 지도 검색용: 키워드로 행사 검색 (위경도 포함)
 * GET /api/events/search?keyword=xxx&size=10
 */
export async function searchEventsForMap(
  keyword: string,
  size: number = 10
): Promise<EventMapResponseItem[]> {
  const encoded = encodeURIComponent(keyword.trim());
  if (!encoded) return [];
  const url = `${API_BASE_URL}/api/events/search?keyword=${encoded}&size=${size}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data: EventMapResponseItem[] = await res.json();
  return (data ?? []).filter(
    (e) =>
      e.latitude != null &&
      e.longitude != null &&
      Number.isFinite(e.latitude) &&
      Number.isFinite(e.longitude)
  );
}

/** 지도 탭 검색: 키워드로 행사 검색 후 Event[] 반환 (목록 표시용) */
export async function searchEventsAsEvents(
  keyword: string,
  size: number = 30
): Promise<Event[]> {
  const raw = await searchEventsForMap(keyword, size);
  return raw.map(eventMapItemToEvent);
}

/** 인기순(좋아요 많은 순) 행사 목록 (홈 캐러셀용) - EventListResponse와 동일 구조 */
export type PopularEventItem = {
  id: number;
  title: string;
  thumbnailUrl: string | null;
  startAt: string;
  endAt: string;
  placeName: string | null;
};

/**
 * 인기 행사 목록 (좋아요 순)
 * GET /api/events/popular?size=3
 */
export async function getPopularEvents(size: number = 3): Promise<PopularEventItem[]> {
  const url = `${API_BASE_URL}/api/events/popular?size=${size}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`popular events failed: ${res.status}`);
  const data: PopularEventItem[] = await res.json();
  return data ?? [];
}

/** 행사 좋아요 상태 (GET /api/events/{id}/like 응답) */
export type EventLikeStatus = { liked: boolean; likeCount: number };

/**
 * 행사 좋아요 상태 조회 (현재 사용자 좋아요 여부 + 전체 좋아요 수)
 * GET /api/events/{eventId}/like — 로그인 시 토큰 전달하면 '내가 좋아요 했는지' 반환
 */
export async function getEventLikeStatus(eventId: number): Promise<EventLikeStatus> {
  const token = await getAccessToken();
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}/api/events/${eventId}/like`, { headers });
  if (!res.ok) throw new Error(`좋아요 상태 조회 실패 (${res.status})`);
  const data = await res.json();
  return { liked: !!data.liked, likeCount: Number(data.likeCount) ?? 0 };
}

/**
 * 좋아요 토글 (로그인 필요)
 * POST /api/events/{eventId}/like
 * @returns { liked, likeCount }
 */
export async function toggleEventLike(eventId: number): Promise<EventLikeStatus> {
  const token = await getAccessToken();
  if (!token) throw new Error('로그인이 필요합니다.');
  const res = await fetch(`${API_BASE_URL}/api/events/${eventId}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('로그인이 필요합니다.');
    throw new Error(`좋아요 처리 실패 (${res.status})`);
  }
  const data = await res.json();
  return { liked: !!data.liked, likeCount: Number(data.likeCount) ?? 0 };
}

/**
 * 좋아요 누른 행사 목록 (마이페이지) - 로그인 필요
 * GET /api/events/liked
 */
export async function getLikedEvents(): Promise<Event[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('로그인이 필요합니다.');
  const res = await fetch(`${API_BASE_URL}/api/events/liked`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('로그인이 필요합니다.');
    throw new Error(`좋아요 누른 행사 목록 조회 실패 (${res.status})`);
  }
  const data: EventListResponseItem[] = await res.json();
  return (data ?? []).map(toEvent);
}
