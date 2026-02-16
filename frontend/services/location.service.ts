/**
 * 체류 인증 API (구역 1초 이상 체류 시 참여 기록 - 날짜·진입시간·체류시간)
 * POST /api/location/start, POST /api/location/complete
 * GET /api/location/stay-sessions/completed
 */
import { API_BASE_URL } from '../constants/api';
import { getAccessToken } from './auth.service';

/** 백엔드 LocalDateTime은 배열 [y,mo,d,h,min,s] 또는 ISO 문자열로 올 수 있음 */
export type StaySessionResponseDto = {
  id: number;
  eventId: number;
  eventTitle: string;
  placeName: string | null;
  startTime: string | number[];
  endTime: string | number[] | null;
  durationMinutes: number;
};

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new Error('로그인이 필요합니다.');
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) ?? {}),
    Authorization: `Bearer ${token}`,
  };
  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
}

/** 체류 시작 (행사 구역 진입 시 호출) */
export async function startStay(eventId: number, latitude: number, longitude: number): Promise<void> {
  const res = await authFetch('/api/location/start', {
    method: 'POST',
    body: JSON.stringify({ eventId, latitude, longitude }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 400 && /이미 체류 인증이 진행 중입니다/.test(text)) return;
    if (res.status === 400 && /이미 인증을 완료한 행사입니다/.test(text)) return;
    throw new Error(text || `체류 시작 실패 (${res.status})`);
  }
}

/** 체류 완료 (구역 이탈 시 또는 30분 경과 시 호출, 1초라도 있었으면 기록) */
export async function completeStay(eventId: number, latitude: number, longitude: number): Promise<void> {
  const res = await authFetch('/api/location/complete', {
    method: 'POST',
    body: JSON.stringify({ eventId, latitude, longitude }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `체류 완료 실패 (${res.status})`);
  }
}

/** 완료된 체류 세션 목록 (참여한 축제: 1초라도 있었으면, 같은 날 같은 행사 1건) */
export async function getCompletedStaySessions(): Promise<StaySessionResponseDto[]> {
  const res = await authFetch('/api/location/stay-sessions/completed');
  if (!res.ok) throw new Error(await res.text().then((t) => t || `조회 실패 (${res.status})`));
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/** 체류 미션 기록: 30분 이상 체류한 세션만 (진입·퇴장 시간) */
export async function getStayMissionSessions(): Promise<StaySessionResponseDto[]> {
  const res = await authFetch('/api/location/stay-sessions/stay-mission');
  if (!res.ok) throw new Error(await res.text().then((t) => t || `조회 실패 (${res.status})`));
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
