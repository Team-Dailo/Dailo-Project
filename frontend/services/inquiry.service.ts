import { API_BASE_URL } from '../constants/api';
import * as authService from './auth.service';

export type InquiryRequest = {
  email: string;
  title: string;
  content: string;
};

export type InquiryItem = {
  id: number;
  memberId: number | null;
  email: string;
  title: string;
  content: string;
  createdAt: string;
};

/** 문의 제출 (비로그인 가능). 로그인 시 토큰 있으면 memberId 저장됨 */
export async function submitInquiry(body: InquiryRequest): Promise<InquiryItem> {
  const token = await authService.getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}/api/inquiries`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || '문의 전송에 실패했습니다.');
  }
  return res.json();
}

/** 관리자: 문의 목록 (최신순) */
export async function getInquiries(params: { page?: number; size?: number }): Promise<{
  content: InquiryItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}> {
  const token = await authService.getAccessToken();
  if (!token) throw new Error('로그인이 필요합니다.');
  const page = params?.page ?? 0;
  const size = params?.size ?? 20;
  const res = await fetch(`${API_BASE_URL}/api/admin/inquiries?page=${page}&size=${size}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 403) throw new Error('관리자만 조회할 수 있습니다.');
    throw new Error('목록을 불러올 수 없습니다.');
  }
  return res.json();
}

/** 관리자: 문의 상세 */
export async function getInquiryById(id: number): Promise<InquiryItem> {
  const token = await authService.getAccessToken();
  if (!token) throw new Error('로그인이 필요합니다.');
  const res = await fetch(`${API_BASE_URL}/api/admin/inquiries/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 403) throw new Error('관리자만 조회할 수 있습니다.');
    if (res.status === 404) throw new Error('문의를 찾을 수 없습니다.');
    throw new Error('상세를 불러올 수 없습니다.');
  }
  return res.json();
}
