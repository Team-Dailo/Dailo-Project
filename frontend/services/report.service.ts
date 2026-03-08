import { API_BASE_URL } from '../constants/api';
import * as authService from './auth.service';

const getDefaultUserId = (): number => {
  const id = process.env.EXPO_PUBLIC_USER_ID;
  if (id != null && id !== '') return Number(id);
  return 1;
};

/** 신고 API는 인증 필요 → JWT + X-User-Id 전달 */
const getHeaders = async (): Promise<HeadersInit> => {
  const token = await authService.getAccessToken();
  const id = (await authService.getStoredUserId()) ?? getDefaultUserId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-User-Id': String(id),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export type ReportType = 'POST' | 'COMMENT' | 'USER' | 'CHAT';
export type ReportReason = 'SPAM' | 'ABUSE' | 'INAPPROPRIATE' | 'OTHER';

export type ReportResponse = {
  id: number;
  reporterId: number;
  targetType: ReportType;
  targetId: number;
  /** 신고 대상 표시용 (게시물 제목, 댓글 내용 요약 등) */
  targetDisplay?: string | null;
  reason: ReportReason;
  description?: string;
  status: string;
  createdAt: string;
  resolvedAt?: string;
};

/** 신고 생성 - POST /api/reports */
export async function createReport(body: {
  targetType: ReportType;
  targetId: number;
  reason: ReportReason;
  description?: string;
}): Promise<ReportResponse> {
  const res = await fetch(`${API_BASE_URL}/api/reports`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`create report failed: ${res.status}`);
  return res.json();
}

/** 내 신고 목록 - GET /api/reports/my */
export async function getMyReports(params?: {
  page?: number;
  size?: number;
}): Promise<{ content: ReportResponse[]; totalElements: number }> {
  const page = params?.page ?? 0;
  const size = params?.size ?? 20;
  const res = await fetch(
    `${API_BASE_URL}/api/reports/my?page=${page}&size=${size}`,
    { headers: await getHeaders() }
  );
  if (!res.ok) throw new Error(`my reports failed: ${res.status}`);
  return res.json();
}
