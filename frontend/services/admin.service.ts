/**
 * 관리자 전용 API (Bearer + X-User-Id 필요)
 * 백엔드 /api/admin/* 연동
 */
import { API_BASE_URL } from '../constants/api';
import { createFormDataFile } from '../utils/uploadFormData';
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
  keyword?: string;
}): Promise<PageResponse<AdminEventResponse>> {
  const q: Record<string, string> = {};
  if (params?.page != null) q.page = String(params.page);
  if (params?.size != null) q.size = String(params.size);
  if (params?.sort != null) q.sort = params.sort;
  if (params?.keyword != null && params.keyword.trim() !== '') q.keyword = params.keyword.trim();
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

/** 행사별 좋아요 수 (관리자용) */
export type AdminEventLikeCountDto = { eventId: number; title: string; likeCount: number };

export async function getAdminEventLikeCounts(): Promise<AdminEventLikeCountDto[]> {
  const res = await adminFetch('/api/admin/events/like-counts');
  if (!res.ok) throw new Error(await res.text().then((t) => t || `조회 실패 (${res.status})`));
  return res.json();
}

/** 행사별 조회수 (관리자용) */
export type AdminEventViewCountDto = {
  eventId: number;
  title: string;
  totalViewCount: number;
  viewCount7d: number;
  viewCount30d: number;
};

export async function getAdminEventViewCounts(): Promise<AdminEventViewCountDto[]> {
  const res = await adminFetch('/api/admin/events/view-counts');
  if (!res.ok) throw new Error(await res.text().then((t) => t || `조회 실패 (${res.status})`));
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
  formData.append('file', createFormDataFile(imageUri, 'photo.jpg') as unknown as Blob);
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

/** 게시글별 신고 기록 (post-record API) */
export type ReportedPostSummaryDto = {
  postId: number;
  reportCount: number;
  title: string;
  authorId: number;
  authorNickname: string;
};

export async function getAdminReportRecord(): Promise<ReportedPostSummaryDto[]> {
  const res = await adminFetch('/api/admin/reports/record/by-post');
  if (!res.ok) throw new Error(await res.text().then((t) => t || `신고 기록 조회 실패 (${res.status})`));
  return res.json();
}

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

/** 관리자용: 신고된 게시글 삭제(소프트 삭제) */
export async function deleteAdminPost(postId: number): Promise<void> {
  const res = await adminFetch(`/api/admin/posts/${postId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text().then((t) => t || `게시글 삭제 실패 (${res.status})`));
}

// --- 회원 목록 (AdminMemberController) ---

export type AdminMemberListItemDto = {
  id: number;
  email: string;
  nickname: string | null;
  role: string | null;
  status: string | null;
  createdAt: string | null;
};

export async function withdrawMember(memberId: number): Promise<void> {
  const res = await adminFetch(`/api/admin/members/${memberId}/withdraw`, { method: 'POST' });
  if (!res.ok) {
    const msg = await res.text().then((t) => t || `탈퇴 처리 실패 (${res.status})`);
    if (res.status === 403) throw new Error('관리자 권한이 필요합니다.');
    throw new Error(msg);
  }
}

export async function getAdminMemberList(params?: {
  page?: number;
  size?: number;
}): Promise<PageResponse<AdminMemberListItemDto>> {
  const q: Record<string, string> = {};
  if (params?.page != null) q.page = String(params.page);
  if (params?.size != null) q.size = String(params.size);
  const query = new URLSearchParams(q).toString();
  const res = await adminFetch(`/api/admin/members${query ? '?' + query : ''}`);
  if (!res.ok) {
    const msg = await res.text().then((t) => t || `회원 목록 조회 실패 (${res.status})`);
    if (res.status === 403) throw new Error('관리자 권한이 필요합니다. 로그아웃 후 관리자 계정으로 다시 로그인해 주세요.');
    throw new Error(msg);
  }
  const data = await res.json();
  return {
    content: data.content ?? [],
    totalElements: data.totalElements ?? 0,
    totalPages: data.totalPages ?? 0,
    size: data.size ?? (params?.size ?? 10),
    number: data.number ?? 0,
    first: data.first ?? true,
    last: data.last ?? true,
  };
}

// --- 차단관리 (5회 이상 차단당한 회원, AdminBlockController / AdminMemberController suspend) ---

export type HeavyBlockedMemberDto = {
  memberId: number;
  email: string;
  nickname: string | null;
  blockCount: number;
  suspendedUntil: string | null;
};

export type SuspendType = '2W' | '1M' | '1Y' | 'PERMANENT' | 'NONE';

export async function getHeavyBlockedList(): Promise<HeavyBlockedMemberDto[]> {
  const res = await adminFetch('/api/admin/blocks/heavy-blocked');
  if (!res.ok) {
    const msg = await res.text().then((t) => t || `차단관리 목록 조회 실패 (${res.status})`);
    if (res.status === 403) throw new Error('관리자 권한이 필요합니다.');
    throw new Error(msg);
  }
  return res.json();
}

export async function suspendMember(memberId: number, type: SuspendType): Promise<void> {
  const res = await adminFetch(`/api/admin/members/${memberId}/suspend`, {
    method: 'PATCH',
    body: JSON.stringify({ type }),
  });
  if (!res.ok) {
    const msg = await res.text().then((t) => t || `정지 적용 실패 (${res.status})`);
    if (res.status === 403) throw new Error('관리자 권한이 필요합니다.');
    throw new Error(msg);
  }
}

// --- 공지사항 관리 (AdminNoticeController) ---

export type NoticeItem = {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

/** 공지 목록 조회 (GET /api/notices, 공개 API) */
export async function getNotices(params?: { page?: number; size?: number }): Promise<{
  content: NoticeItem[];
  totalPages: number;
  totalElements: number;
  number: number;
}> {
  const page = params?.page ?? 0;
  const size = params?.size ?? 100;
  const url = `${API_BASE_URL}/api/notices?page=${page}&size=${size}&sort=createdAt,desc`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`공지 목록 조회 실패: ${res.status}`);
  const data = await res.json();
  return {
    content: (data.content ?? []).map((n: { id: number; title: string; content: string; createdAt: string; updatedAt: string }) => ({
      id: n.id,
      title: n.title ?? '',
      content: n.content ?? '',
      createdAt: n.createdAt ?? '',
      updatedAt: n.updatedAt ?? '',
    })),
    totalPages: data.totalPages ?? 0,
    totalElements: data.totalElements ?? 0,
    number: data.number ?? 0,
  };
}

export type NoticeCreateRequest = { title: string; content: string };

export async function createNotice(body: NoticeCreateRequest): Promise<number> {
  const res = await adminFetch('/api/admin/notices', {
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

export async function updateNotice(id: number, body: NoticeCreateRequest): Promise<number> {
  const res = await adminFetch(`/api/admin/notices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return id;
}

export async function deleteNotice(id: number): Promise<void> {
  const res = await adminFetch(`/api/admin/notices/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text().then((t) => t || '공지 삭제 실패'));
}

// --- 대시보드 (AdminDashboardController) ---

export type DashboardResponse = {
  totalMembers: number;
  totalPosts: number;
  totalComments: number;
  totalEvents: number;
  pendingReports: number;
  pendingInquiries: number;
  todaySignups: number;
  todayPosts: number;
};

export async function getDashboard(): Promise<DashboardResponse> {
  const res = await adminFetch('/api/admin/dashboard');
  if (!res.ok) throw new Error(await res.text().then((t) => t || '대시보드 조회 실패'));
  return res.json();
}

// --- FAQ 관리 (AdminFaqController) ---

export type FaqItem = {
  id: number;
  category: string;
  question: string;
  answer: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FaqCreateRequest = {
  category: string;
  question: string;
  answer: string;
  displayOrder?: number;
};

export async function getAdminFaqList(params?: {
  page?: number;
  size?: number;
}): Promise<PageResponse<FaqItem>> {
  const q: Record<string, string> = {};
  if (params?.page != null) q.page = String(params.page);
  if (params?.size != null) q.size = String(params.size);
  const query = new URLSearchParams(q).toString();
  const res = await adminFetch(`/api/admin/faq${query ? '?' + query : ''}`);
  if (!res.ok) throw new Error(await res.text().then((t) => t || 'FAQ 목록 조회 실패'));
  return res.json();
}

export async function getAdminFaqDetail(id: number): Promise<FaqItem> {
  const res = await adminFetch(`/api/admin/faq/${id}`);
  if (!res.ok) throw new Error(await res.text().then((t) => t || 'FAQ 상세 조회 실패'));
  return res.json();
}

export async function createFaq(body: FaqCreateRequest): Promise<FaqItem> {
  const res = await adminFetch('/api/admin/faq', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}

export async function updateFaq(id: number, body: FaqCreateRequest): Promise<FaqItem> {
  const res = await adminFetch(`/api/admin/faq/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}

export async function deleteFaq(id: number): Promise<void> {
  const res = await adminFetch(`/api/admin/faq/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text().then((t) => t || 'FAQ 삭제 실패'));
}

export async function toggleFaqActive(id: number): Promise<FaqItem> {
  const res = await adminFetch(`/api/admin/faq/${id}/toggle`, { method: 'PATCH' });
  if (!res.ok) throw new Error(await res.text().then((t) => t || 'FAQ 상태 변경 실패'));
  return res.json();
}

// --- 배너 관리 (AdminBannerController) ---

export type BannerItem = {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  linkType: 'INTERNAL' | 'EXTERNAL' | 'NONE';
  displayOrder: number;
  startAt: string | null;
  endAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BannerCreateRequest = {
  title: string;
  imageUrl: string;
  linkUrl?: string | null;
  linkType?: 'INTERNAL' | 'EXTERNAL' | 'NONE';
  displayOrder?: number;
  startAt?: string | null;
  endAt?: string | null;
};

export async function getAdminBannerList(params?: {
  page?: number;
  size?: number;
}): Promise<PageResponse<BannerItem>> {
  const q: Record<string, string> = {};
  if (params?.page != null) q.page = String(params.page);
  if (params?.size != null) q.size = String(params.size);
  const query = new URLSearchParams(q).toString();
  const res = await adminFetch(`/api/admin/banners${query ? '?' + query : ''}`);
  if (!res.ok) throw new Error(await res.text().then((t) => t || '배너 목록 조회 실패'));
  return res.json();
}

export async function getAdminBannerDetail(id: number): Promise<BannerItem> {
  const res = await adminFetch(`/api/admin/banners/${id}`);
  if (!res.ok) throw new Error(await res.text().then((t) => t || '배너 상세 조회 실패'));
  return res.json();
}

export async function createBanner(body: BannerCreateRequest): Promise<BannerItem> {
  const res = await adminFetch('/api/admin/banners', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}

export async function updateBanner(id: number, body: BannerCreateRequest): Promise<BannerItem> {
  const res = await adminFetch(`/api/admin/banners/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}

export async function deleteBanner(id: number): Promise<void> {
  const res = await adminFetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text().then((t) => t || '배너 삭제 실패'));
}

export async function toggleBannerActive(id: number): Promise<BannerItem> {
  const res = await adminFetch(`/api/admin/banners/${id}/toggle`, { method: 'PATCH' });
  if (!res.ok) throw new Error(await res.text().then((t) => t || '배너 상태 변경 실패'));
  return res.json();
}

// --- 앱 버전 관리 (AdminAppVersionController) ---

export type AppVersionItem = {
  id: number;
  platform: 'IOS' | 'ANDROID';
  minimumVersion: string;
  latestVersion: string;
  forceUpdate: boolean;
  storeUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AppVersionCreateRequest = {
  platform: 'IOS' | 'ANDROID';
  minimumVersion: string;
  latestVersion: string;
  forceUpdate?: boolean;
  storeUrl?: string | null;
};

export async function getAdminAppVersionList(): Promise<AppVersionItem[]> {
  const res = await adminFetch('/api/admin/app-version');
  if (!res.ok) throw new Error(await res.text().then((t) => t || '앱 버전 목록 조회 실패'));
  return res.json();
}

export async function getAdminAppVersionDetail(id: number): Promise<AppVersionItem> {
  const res = await adminFetch(`/api/admin/app-version/${id}`);
  if (!res.ok) throw new Error(await res.text().then((t) => t || '앱 버전 상세 조회 실패'));
  return res.json();
}

export async function createAppVersion(body: AppVersionCreateRequest): Promise<AppVersionItem> {
  const res = await adminFetch('/api/admin/app-version', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}

export async function updateAppVersion(id: number, body: AppVersionCreateRequest): Promise<AppVersionItem> {
  const res = await adminFetch(`/api/admin/app-version/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}

export async function deleteAppVersion(id: number): Promise<void> {
  const res = await adminFetch(`/api/admin/app-version/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text().then((t) => t || '앱 버전 삭제 실패'));
}

// --- 관리자 활동 로그 (AdminLogController) ---

export type AdminLogItem = {
  id: number;
  adminId: number;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: number | null;
  description: string | null;
  ipAddress: string | null;
  createdAt: string;
};

export async function getAdminLogs(params?: {
  page?: number;
  size?: number;
}): Promise<PageResponse<AdminLogItem>> {
  const q: Record<string, string> = {};
  if (params?.page != null) q.page = String(params.page);
  if (params?.size != null) q.size = String(params.size);
  const query = new URLSearchParams(q).toString();
  const res = await adminFetch(`/api/admin/logs${query ? '?' + query : ''}`);
  if (!res.ok) throw new Error(await res.text().then((t) => t || '활동 로그 조회 실패'));
  return res.json();
}

// --- 댓글 관리 (AdminCommentController) ---

export type AdminCommentItem = {
  id: number;
  postId: number;
  postTitle: string | null;
  authorId: number;
  authorNickname: string | null;
  content: string;
  status: 'VISIBLE' | 'HIDDEN' | 'DELETED';
  createdAt: string;
  reportCount: number;
};

export async function getAdminComments(params?: {
  page?: number;
  size?: number;
}): Promise<PageResponse<AdminCommentItem>> {
  const q: Record<string, string> = {};
  if (params?.page != null) q.page = String(params.page);
  if (params?.size != null) q.size = String(params.size);
  const query = new URLSearchParams(q).toString();
  const res = await adminFetch(`/api/admin/comments${query ? '?' + query : ''}`);
  if (!res.ok) throw new Error(await res.text().then((t) => t || '댓글 목록 조회 실패'));
  return res.json();
}

export async function getAdminReportedComments(params?: {
  page?: number;
  size?: number;
}): Promise<PageResponse<AdminCommentItem>> {
  const q: Record<string, string> = {};
  if (params?.page != null) q.page = String(params.page);
  if (params?.size != null) q.size = String(params.size);
  const query = new URLSearchParams(q).toString();
  const res = await adminFetch(`/api/admin/comments/reported${query ? '?' + query : ''}`);
  if (!res.ok) throw new Error(await res.text().then((t) => t || '신고된 댓글 조회 실패'));
  return res.json();
}

export async function hideComment(id: number): Promise<void> {
  const res = await adminFetch(`/api/admin/comments/${id}/hide`, { method: 'PATCH' });
  if (!res.ok) throw new Error(await res.text().then((t) => t || '댓글 숨김 실패'));
}

export async function restoreComment(id: number): Promise<void> {
  const res = await adminFetch(`/api/admin/comments/${id}/restore`, { method: 'PATCH' });
  if (!res.ok) throw new Error(await res.text().then((t) => t || '댓글 복원 실패'));
}

export async function deleteAdminComment(id: number): Promise<void> {
  const res = await adminFetch(`/api/admin/comments/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text().then((t) => t || '댓글 삭제 실패'));
}

// --- 푸시 알림 발송 (AdminNotificationController) ---

export type PushResponse = {
  success: boolean;
  message: string;
  sentCount: number;
  failedCount: number;
};

export async function sendPushToAll(title: string, body: string): Promise<PushResponse> {
  const res = await adminFetch('/api/admin/notifications/send-all', {
    method: 'POST',
    body: JSON.stringify({ title, body }),
  });
  if (!res.ok) throw new Error(await res.text().then((t) => t || '전체 발송 실패'));
  return res.json();
}

export async function sendPushToMembers(title: string, body: string, memberIds: number[]): Promise<PushResponse> {
  const res = await adminFetch('/api/admin/notifications/send', {
    method: 'POST',
    body: JSON.stringify({ title, body, memberIds }),
  });
  if (!res.ok) throw new Error(await res.text().then((t) => t || '발송 실패'));
  return res.json();
}

// --- 문의 답변 (AdminInquiryController) ---

export type InquiryDetailItem = {
  id: number;
  memberId: number | null;
  email: string;
  title: string;
  content: string;
  status: 'PENDING' | 'ANSWERED' | 'CLOSED';
  answer: string | null;
  answeredAt: string | null;
  answeredBy: number | null;
  createdAt: string;
};

export async function getAdminInquiryDetail(id: number): Promise<InquiryDetailItem> {
  const res = await adminFetch(`/api/admin/inquiries/${id}`);
  if (!res.ok) throw new Error(await res.text().then((t) => t || '문의 상세 조회 실패'));
  return res.json();
}

export async function answerInquiry(id: number, answer: string): Promise<InquiryDetailItem> {
  const res = await adminFetch(`/api/admin/inquiries/${id}/answer`, {
    method: 'PUT',
    body: JSON.stringify({ answer }),
  });
  if (!res.ok) throw new Error(await res.text().then((t) => t || '답변 등록 실패'));
  return res.json();
}

export async function closeInquiry(id: number): Promise<InquiryDetailItem> {
  const res = await adminFetch(`/api/admin/inquiries/${id}/close`, { method: 'PATCH' });
  if (!res.ok) throw new Error(await res.text().then((t) => t || '문의 종료 실패'));
  return res.json();
}
