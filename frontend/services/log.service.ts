import { API_BASE_URL } from '../constants/api';
import * as authService from './auth.service';

const getDefaultUserId = (): number => {
  const id = process.env.EXPO_PUBLIC_USER_ID;
  if (id != null && id !== '') return Number(id);
  return 1;
};

const getHeaders = async (): Promise<HeadersInit> => {
  const id = (await authService.getStoredUserId()) ?? getDefaultUserId();
  return {
    'Content-Type': 'application/json',
    'X-User-Id': String(id),
  };
};

/** 검색 로그 기록 - POST /api/logs/search */
export async function logSearch(body: {
  keyword: string;
  filters?: string;
  resultCount?: number;
  requestId?: string;
}): Promise<{ id: number }> {
  const res = await fetch(`${API_BASE_URL}/api/logs/search`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`log search failed: ${res.status}`);
  return res.json();
}

/** 인기 검색어 - GET /api/logs/search/top */
export async function getTopSearchKeywords(limit = 10): Promise<string[]> {
  const res = await fetch(`${API_BASE_URL}/api/logs/search/top?limit=${limit}`);
  if (!res.ok) throw new Error(`top keywords failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/** 인기 검색어 + 검색 수 (순위·검색수 표시용) - GET /api/logs/search/top-with-count */
export type TopSearchKeywordItem = { keyword: string; count: number };

export async function getTopSearchKeywordsWithCount(limit = 10): Promise<TopSearchKeywordItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/logs/search/top-with-count?limit=${limit}`);
  if (!res.ok) throw new Error(`top keywords with count failed: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((x: { keyword?: string; count?: number }) => ({
    keyword: x.keyword ?? '',
    count: typeof x.count === 'number' ? x.count : 0,
  }));
}

/** 클릭 로그 기록 - POST /api/logs/click */
export async function logClick(body: {
  eventId: number;
  source: string;
  requestId?: string;
}): Promise<{ id: number }> {
  const res = await fetch(`${API_BASE_URL}/api/logs/click`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`log click failed: ${res.status}`);
  return res.json();
}

/** 이벤트 클릭 수 - GET /api/logs/click/count/{eventId} */
export async function getEventClickCount(eventId: number): Promise<number> {
  const res = await fetch(`${API_BASE_URL}/api/logs/click/count/${eventId}`);
  if (!res.ok) throw new Error(`click count failed: ${res.status}`);
  const data = await res.json();
  return typeof data === 'number' ? data : 0;
}

/** 인기 클릭 이벤트 ID 목록 - GET /api/logs/click/top */
export async function getTopClickedEventIds(limit = 10): Promise<number[]> {
  const res = await fetch(`${API_BASE_URL}/api/logs/click/top?limit=${limit}`);
  if (!res.ok) throw new Error(`top clicked failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
