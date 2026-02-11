import { API_BASE_URL } from '../constants/api';
import { getAccessToken } from './auth.service';
import type { Event, EventDetail } from '../types/event';

/** 백엔드 이벤트 리스트 응답 (EventListResponse: id, title, thumbnailUrl, startAt, endAt, placeName) */
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
};

/** 백엔드 카테고리 → 프론트 EventCategory (없으면 EXHIBITION) */
const mapCategory = (cat?: string | null): Event['category'] => {
  const map: Record<string, Event['category']> = {
    FESTIVAL: 'PERFORMANCE',
    EXHIBITION: 'EXHIBITION',
    TRAFFIC: 'EXPERIENCE',
    CONSTRUCTION: 'EXPERIENCE',
    ETC: 'EXHIBITION',
  };
  if (!cat || !(cat in map)) return 'EXHIBITION';
  return map[cat];
};

/** 백엔드 응답 → 프론트 Event (지도/리스트 공통) */
function toEvent(item: EventListResponseItem): Event {
  const category = item.categories?.[0]
    ? mapCategory(item.categories[0])
    : 'EXHIBITION';
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
 * 이벤트 목록 조회 (리스트/지도 공통)
 * - 지도용: size 크게 해서 가져온 뒤 latitude, longitude 있는 것만 마커로 표시
 */
export async function getEventList(params?: {
  page?: number;
  size?: number;
}): Promise<Event[]> {
  const page = params?.page ?? 1;
  const size = params?.size ?? 100;
  const url = `${API_BASE_URL}/api/events?page=${page}&size=${size}`;
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

/** 백엔드 지도 마커 응답 (EventMapResponse) */
type EventMapResponseItem = {
  id: number;
  title: string;
  latitude: number | null;
  longitude: number | null;
  category: string;
  thumbnailUrl: string | null;
  status?: string;
};

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
  return list.map((item) => ({
    id: String(item.id),
    title: item.title,
    category: mapCategory(item.category),
    scale: 'UNIVERSITY',
    startAt: '',
    endAt: '',
    latitude: item.latitude ?? 0,
    longitude: item.longitude ?? 0,
    address: '',
    placeName: '',
    thumbnailUrl: item.thumbnailUrl ?? undefined,
    isBookmarked: false,
  }));
}

/** 백엔드 상세 응답 (EventDetailResponse) - startAt/endAt ISO 문자열로 수신 */
type EventDetailResponseRaw = {
  id: number;
  title: string;
  posterUrls: string[] | null;
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
  extraJson?: string | null;
  likeCount?: number;
  isLiked?: boolean;
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
  if (__DEV__) console.log('[Event API] detail ok:', raw?.id ?? id);
  return {
    id: raw.id,
    title: raw.title,
    posterUrls: raw.posterUrls ?? [],
    startAt: raw.startAt,
    endAt: raw.endAt,
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
  };
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

/**
 * 좋아요 토글 (로그인 필요)
 * POST /api/events/{eventId}/like
 * @returns { liked, likeCount }
 */
export async function toggleEventLike(eventId: number): Promise<{ liked: boolean; likeCount: number }> {
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
