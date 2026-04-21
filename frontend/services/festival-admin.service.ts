/**
 * 축제 관리자 전용 API
 * FESTIVAL_ADMIN 또는 ADMIN 권한으로 특정 축제만 관리
 */
import { API_BASE_URL } from '../constants/api';
import * as authService from './auth.service';
import type { AdminEventResponse, AdminEventCreateRequest } from './admin.service';

/** 저장된 회원 ID 반환 */
async function getAdminUserId(): Promise<number | null> {
  let userId = await authService.getStoredUserId();
  if (userId != null && userId > 0) return userId;
  const me = await authService.getMe();
  const id = me?.id != null && me.id > 0 ? me.id : null;
  if (id != null) {
    await authService.setStoredUserId(id);
    return id;
  }
  return null;
}

async function festivalAdminFetch(
  path: string,
  options: RequestInit & { params?: Record<string, string> } = {}
): Promise<Response> {
  const token = await authService.getAccessToken();
  if (!token) throw new Error('로그인이 필요합니다.');
  const userId = await getAdminUserId();

  const { params, ...rest } = options;
  let url = `${API_BASE_URL}${path}`;
  if (params && Object.keys(params).length > 0) {
    const search = new URLSearchParams(params).toString();
    url += (path.includes('?') ? '&' : '?') + search;
  }

  const headers: Record<string, string> = {
    ...((rest.headers as Record<string, string>) ?? {}),
    Authorization: `Bearer ${token}`,
  };
  if (userId != null && userId > 0) {
    headers['X-User-Id'] = String(userId);
  }
  if (rest.body && typeof rest.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  return fetch(url, { ...rest, headers });
}

// --- 타입 ---

export type HourlyCount = {
  hour: number;  // 0-23
  count: number;
};

export type EventActivityStatsResponse = {
  eventId: number;
  eventTitle: string;
  date: string;
  hourlyCounts: HourlyCount[];
  totalViews: number;
};

// --- API 함수 ---

/** 내가 관리하는 축제 목록 */
export async function getMyManagedEvents(): Promise<AdminEventResponse[]> {
  const res = await festivalAdminFetch('/api/festival-admin/my-events');
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || '축제 목록 조회 실패');
  }
  return res.json();
}

/** 축제 상세 조회 */
export async function getFestivalEventDetail(eventId: number): Promise<AdminEventResponse> {
  const res = await festivalAdminFetch(`/api/festival-admin/events/${eventId}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || '축제 상세 조회 실패');
  }
  return res.json();
}

/** 축제 수정 */
export async function updateFestivalEvent(
  eventId: number,
  body: AdminEventCreateRequest
): Promise<number> {
  const res = await festivalAdminFetch(`/api/festival-admin/events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || '축제 수정 실패');
  }
  return res.json();
}

/** 시간대별 사용자 활동 통계 */
export async function getEventActivityStats(
  eventId: number,
  date: string // YYYY-MM-DD
): Promise<EventActivityStatsResponse> {
  const res = await festivalAdminFetch(`/api/festival-admin/events/${eventId}/activity-stats`, {
    params: { date },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || '활동 통계 조회 실패');
  }
  return res.json();
}
