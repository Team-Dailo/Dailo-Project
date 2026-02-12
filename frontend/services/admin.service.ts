/**
 * 관리자 전용 API (Bearer + X-User-Id 필요)
 * 백엔드 /api/admin/* 연동
 */
import { API_BASE_URL } from '../constants/api';
import * as authService from './auth.service';

/** 저장된 회원 ID 반환. 없으면 getMe()로 조회해 저장. 그래도 없으면 null (백엔드가 JWT에서 ID 사용) */
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

async function adminFetch(
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

// --- 타입 (백엔드 DTO 대응) ---

export type AdminEventResponse = {
  id: number;
  title: string;
  placeName?: string | null;
  placeAddress?: string | null;
  regionName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  startAt: string;
  endAt: string;
  categories?: string[];
  scale?: string | null;
  filterGroup?: string | null; // CHUNGJU_CITY | UNIVERSITY | STUDENT_COUNCIL | COLLEGE | CLUB
  status?: string;
  thumbnailUrl?: string | null;
  description?: string | null;
  hostContact?: string | null;
  adminManaged?: boolean;
  /** 소식/타임테이블/부스 JSON */
  extraJson?: string | null;
};

export type AdminEventCreateRequest = {
  title: string;
  placeName?: string | null;
  placeAddress?: string | null;
  regionName?: string | null;
  latitude: number;
  longitude: number;
  startAt: string;
  endAt: string;
  categories: string[];
  scale?: string | null; // SMALL | MEDIUM | LARGE
  filterGroup?: string | null; // CHUNGJU_CITY | UNIVERSITY | STUDENT_COUNCIL | COLLEGE | CLUB (달력 필터)
  status?: string;
  thumbnailUrl?: string | null;
  posterUrls?: string[];
  description?: string | null;
  hostContact?: string | null;
  extraJson?: string | null;
};

export type ReportResponseDto = {
  id: number;
  reporterId: number;
  targetType: string;
  targetId: number;
  reason: string;
  description?: string | null;
  status: string;
  createdAt: string;
  resolvedAt?: string | null;
};

export type AdminReportDetailResponseDto = {
  id: number;
  reporterId: number;
  targetType: string;
  targetId: number;
  reason: string;
  description?: string | null;
  status: string;
  createdAt: string;
  resolvedAt?: string | null;
  actions?: ReportActionResponseDto[];
};

export type ReportActionResponseDto = {
  id: number;
  actionType: string;
  reason?: string | null;
  createdAt: string;
};

export type ReportActionRequestDto = {
  actionType: string;
  reason?: string | null;
};

export type SyncLogResponseDto = {
  id: number;
  sourceType: string;
  status: string;
  totalCount?: number | null;
  successCount?: number | null;
  failCount?: number | null;
  errorMessage?: string | null;
  startedAt: string;
  completedAt?: string | null;
};

export type SyncLogStartRequestDto = { sourceType: string };
export type SyncLogCompleteRequestDto = {
  success: boolean;
  totalCount?: number | null;
  successCount?: number | null;
  failCount?: number | null;
  errorMessage?: string | null;
};

export type IngestLogResponseDto = {
  id: number;
  batchId?: string | null;
  source?: string | null;
  totalCount?: number | null;
  successCount?: number | null;
  failCount?: number | null;
  errorSummary?: string | null;
  createdAt: string;
};

export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
};

// --- 행사 관리 (AdminEventController) ---

export async function getAdminEventList(params?: {
  page?: number;
  size?: number;
  sort?: string;
}): Promise<PageResponse<AdminEventResponse>> {
  const q: Record<string, string> = {};
  if (params?.page != null) q.page = String(params.page);
  if (params?.size != null) q.size = String(params.size);
  if (params?.sort != null) q.sort = params.sort;
  const res = await adminFetch(`/api/admin/events${Object.keys(q).length ? '?' + new URLSearchParams(q).toString() : ''}`);
  if (!res.ok) {
    const msg = await res.text().then((t) => t || `목록 조회 실패 (${res.status})`);
    if (res.status === 403) throw new Error('관리자 권한이 필요합니다. 로그아웃 후 관리자 계정으로 다시 로그인해 주세요.');
    throw new Error(msg);
  }
  return res.json();
}

export async function getAdminEventDetail(eventId: number): Promise<AdminEventResponse> {
  const res = await adminFetch(`/api/admin/events/${eventId}`);
  if (!res.ok) throw new Error(await res.text().then((t) => t || `상세 조회 실패 (${res.status})`));
  return res.json();
}

async function parseErrorResponse(res: Response): Promise<string> {
  const text = await res.text();
  if (!text) return `요청 실패 (${res.status})`;
  try {
    const json = JSON.parse(text) as { message?: string };
    return json?.message ?? text;
  } catch {
    return text;
  }
}

export async function createAdminEvent(body: AdminEventCreateRequest): Promise<number> {
  const res = await adminFetch('/api/admin/events', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  const bodyRes = await res.text();
  if (!bodyRes) return 0;
  try {
    return JSON.parse(bodyRes) as number;
  } catch {
    return Number(bodyRes) || 0;
  }
}

export async function updateAdminEvent(eventId: number, body: AdminEventCreateRequest): Promise<number> {
  const res = await adminFetch(`/api/admin/events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  const bodyRes = await res.text();
  if (!bodyRes) return eventId;
  try {
    return JSON.parse(bodyRes) as number;
  } catch {
    return Number(bodyRes) || eventId;
  }
}

export async function deleteAdminEvent(eventId: number): Promise<void> {
  const res = await adminFetch(`/api/admin/events/${eventId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text().then((t) => t || `삭제 실패 (${res.status})`));
}

/** 행사 대표/포스터 이미지 업로드. 로컬 이미지 URI → 서버 저장 후 접근 URL 반환 */
export async function uploadAdminEventImage(imageUri: string): Promise<string> {
  const token = await authService.getAccessToken();
  if (!token) throw new Error('로그인이 필요합니다.');
  const userId = await getAdminUserId();
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'photo.jpg',
  } as unknown as Blob);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (userId != null && userId > 0) {
    headers['X-User-Id'] = String(userId);
  }
  const res = await fetch(`${API_BASE_URL}/api/admin/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) throw new Error(await res.text().then((t) => t || `업로드 실패 (${res.status})`));
  const data = (await res.json()) as { path?: string };
  const path = data?.path ?? '';
  if (!path) throw new Error('업로드 응답에 path가 없습니다.');
  return `${API_BASE_URL}${path}`;
}

// --- 신고 처리 (AdminReportController) ---

export async function getAdminReports(params?: {
  status?: string;
  targetType?: string;
  page?: number;
  size?: number;
  sort?: string;
}): Promise<PageResponse<ReportResponseDto>> {
  const q: Record<string, string> = {};
  if (params?.status != null) q.status = params.status;
  if (params?.targetType != null) q.targetType = params.targetType;
  if (params?.page != null) q.page = String(params.page);
  if (params?.size != null) q.size = String(params.size);
  if (params?.sort != null) q.sort = params.sort;
  const query = new URLSearchParams(q).toString();
  const res = await adminFetch(`/api/admin/reports${query ? '?' + query : ''}`);
  if (!res.ok) throw new Error(await res.text().then((t) => t || `신고 목록 조회 실패 (${res.status})`));
  return res.json();
}

export async function getAdminReportDetail(reportId: number): Promise<AdminReportDetailResponseDto> {
  const res = await adminFetch(`/api/admin/reports/${reportId}`);
  if (!res.ok) throw new Error(await res.text().then((t) => t || `신고 상세 실패 (${res.status})`));
  return res.json();
}

export async function processReport(
  reportId: number,
  body: ReportActionRequestDto
): Promise<ReportActionResponseDto> {
  const res = await adminFetch(`/api/admin/reports/${reportId}/action`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text().then((t) => t || `처리 실패 (${res.status})`));
  return res.json();
}

// --- 동기화 로그 (AdminSyncLogController) ---

export async function getAdminSyncLogs(params?: {
  sourceType?: string;
  status?: string;
  page?: number;
  size?: number;
  sort?: string;
}): Promise<PageResponse<SyncLogResponseDto>> {
  const q: Record<string, string> = {};
  if (params?.sourceType != null) q.sourceType = params.sourceType;
  if (params?.status != null) q.status = params.status;
  if (params?.page != null) q.page = String(params.page);
  if (params?.size != null) q.size = String(params.size);
  if (params?.sort != null) q.sort = params.sort;
  const query = new URLSearchParams(q).toString();
  const res = await adminFetch(`/api/admin/sync-logs${query ? '?' + query : ''}`);
  if (!res.ok) throw new Error(await res.text().then((t) => t || `동기화 로그 목록 실패 (${res.status})`));
  return res.json();
}

export async function getAdminSyncLogDetail(logId: number): Promise<SyncLogResponseDto> {
  const res = await adminFetch(`/api/admin/sync-logs/${logId}`);
  if (!res.ok) throw new Error(await res.text().then((t) => t || `동기화 로그 상세 실패 (${res.status})`));
  return res.json();
}

export async function startSync(body: SyncLogStartRequestDto): Promise<SyncLogResponseDto> {
  const res = await adminFetch('/api/admin/sync-logs/start', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text().then((t) => t || `동기화 시작 실패 (${res.status})`));
  return res.json();
}

export async function completeSync(
  logId: number,
  body: SyncLogCompleteRequestDto
): Promise<SyncLogResponseDto> {
  const res = await adminFetch(`/api/admin/sync-logs/${logId}/complete`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text().then((t) => t || `동기화 완료 기록 실패 (${res.status})`));
  return res.json();
}

// --- 수집 로그 (AdminIngestLogController) ---

export async function getAdminIngestLogs(params?: {
  source?: string;
  page?: number;
  size?: number;
  sort?: string;
}): Promise<PageResponse<IngestLogResponseDto>> {
  const q: Record<string, string> = {};
  if (params?.source != null) q.source = params.source;
  if (params?.page != null) q.page = String(params.page);
  if (params?.size != null) q.size = String(params.size);
  if (params?.sort != null) q.sort = params.sort;
  const query = new URLSearchParams(q).toString();
  const res = await adminFetch(`/api/admin/ingest-logs${query ? '?' + query : ''}`);
  if (!res.ok) throw new Error(await res.text().then((t) => t || `수집 로그 목록 실패 (${res.status})`));
  return res.json();
}

export async function getAdminIngestLogDetail(id: number): Promise<IngestLogResponseDto> {
  const res = await adminFetch(`/api/admin/ingest-logs/${id}`);
  if (!res.ok) throw new Error(await res.text().then((t) => t || `수집 로그 상세 실패 (${res.status})`));
  return res.json();
}

// --- 게시글 관리 (AdminPostController) ---

export async function updatePostAuthor(postId: number, authorId: number): Promise<void> {
  const res = await adminFetch(`/api/admin/posts/${postId}/author`, {
    method: 'PATCH',
    body: JSON.stringify({ authorId }),
  });
  if (!res.ok) throw new Error(await res.text().then((t) => t || `작성자 변경 실패 (${res.status})`));
}
