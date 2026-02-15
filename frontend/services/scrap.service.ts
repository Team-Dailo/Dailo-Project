import { API_BASE_URL } from '../constants/api';
import { getAccessToken } from './auth.service';

/** 백엔드 스크랩 목록 응답 아이템 (EventListResponse) */
export type ScrapEventItem = {
  id: number;
  title: string;
  thumbnailUrl: string | null;
  startAt: string;
  endAt: string;
  placeName: string | null;
};

/** Spring Page 응답 */
type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
};

/**
 * 내 스크랩(저장한 축제) 목록 조회
 * GET /api/scraps (JWT 필요)
 */
export async function getMyScraps(params?: {
  page?: number;
  size?: number;
}): Promise<{ list: ScrapEventItem[]; totalElements: number }> {
  const token = await getAccessToken();
  if (!token) throw new Error('로그인이 필요합니다.');

  const page = params?.page ?? 0;
  const size = params?.size ?? 20;
  const url = `${API_BASE_URL}/api/scraps?page=${page}&size=${size}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('로그인이 필요합니다.');
    throw new Error(`스크랩 목록 조회 실패 (${res.status})`);
  }
  const data: PageResponse<ScrapEventItem> = await res.json();
  return {
    list: data.content ?? [],
    totalElements: data.totalElements ?? 0,
  };
}

/**
 * 스크랩 토글 (저장 ↔ 해제)
 * POST /api/scraps/{eventId} (JWT 필요)
 * @returns true = 저장됨, false = 삭제됨
 */
export async function toggleScrap(eventId: number): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) throw new Error('로그인이 필요합니다.');

  const res = await fetch(`${API_BASE_URL}/api/scraps/${eventId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('로그인이 필요합니다.');
    throw new Error(`스크랩 처리 실패 (${res.status})`);
  }
  const text = await res.text();
  return text.includes('저장됨');
}
