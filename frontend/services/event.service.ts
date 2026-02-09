import { API_BASE_URL } from '../constants/api';
import type { Event } from '../types/event';

/** 백엔드 이벤트 리스트 응답 (EventListResponse) */
type EventListResponseItem = {
  id: number;
  title: string;
  thumbnailUrl?: string | null;
  startDateTime: string;
  endDateTime: string;
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
    startAt: item.startDateTime,
    endAt: item.endDateTime,
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
