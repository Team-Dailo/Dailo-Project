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
  const text = (await res.text()).trim();

  // 백엔드가 "저장되었습니다", "저장이 해제되었습니다" 등 한글 메시지를 내려줄 수 있으므로
  // - "해제" / "삭제" 가 포함되면 false (해제)
  // - 그 외 "저장" 이 포함되면 true (저장)
  if (!text) return false;
  if (text.includes('해제') || text.includes('삭제')) return false;
  if (text.includes('저장')) return true;

  // 혹시 JSON 형식으로 내려오는 경우를 대비해 boolean 필드도 시도
  try {
    const json = JSON.parse(text) as { saved?: boolean; isScraped?: boolean; bookmarked?: boolean };
    if (typeof json.saved === 'boolean') return json.saved;
    if (typeof json.isScraped === 'boolean') return json.isScraped;
    if (typeof json.bookmarked === 'boolean') return json.bookmarked;
  } catch {
    // not JSON, fall through
  }

  // 알 수 없는 응답이면 "해제" 쪽으로 안전하게 처리
  return false;
}
