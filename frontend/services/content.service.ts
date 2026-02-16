import { API_BASE_URL } from '../constants/api';
import * as authService from './auth.service';

/** 이용 안내: guide.tsx(사용자)에서 조회, admin-guide.tsx(관리자)에서 수정. 마크다운(##/###/문단) 지원 */
export type UsageGuideResponse = { content: string };

/** 이용 안내 문구 조회 (비로그인 가능, GET /api/content/usage-guide) */
export async function getUsageGuide(): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/api/content/usage-guide`);
  if (!res.ok) throw new Error('이용 안내를 불러올 수 없습니다.');
  const data: UsageGuideResponse = await res.json();
  return data?.content ?? '';
}

/** 이용 안내 문구 수정 (관리자 전용, PUT /api/admin/content/usage-guide) */
export async function updateUsageGuide(content: string): Promise<string> {
  const token = await authService.getAccessToken();
  if (!token) throw new Error('로그인이 필요합니다.');
  const res = await fetch(`${API_BASE_URL}/api/admin/content/usage-guide`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    if (res.status === 403) throw new Error('관리자만 수정할 수 있습니다.');
    throw new Error('저장에 실패했습니다.');
  }
  const data: UsageGuideResponse = await res.json();
  return data?.content ?? '';
}
