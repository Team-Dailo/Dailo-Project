import { API_BASE_URL } from '../constants/api';
import * as authService from './auth.service';

const getDefaultUserId = (): number => {
  const id = process.env.EXPO_PUBLIC_USER_ID;
  if (id != null && id !== '') return Number(id);
  return 1;
};

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

export type BlockResponse = {
  id: number;
  blockerId: number;
  blockedId: number;
  /** 차단한 사용자 닉네임 (목록 표시용) */
  blockedNickname?: string | null;
  createdAt: string;
};

export type BlockCheckResponse = {
  iBlockedThem: boolean;
  theyBlockedMe: boolean;
};

/** 내 차단 목록 - GET /api/blocks/me */
export async function getMyBlocks(): Promise<BlockResponse[]> {
  const res = await fetch(`${API_BASE_URL}/api/blocks/me`, {
    headers: await getHeaders(),
  });
  if (!res.ok) throw new Error(`get blocks failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/** 차단하기 - POST /api/blocks */
export async function blockUser(blockedId: number): Promise<BlockResponse> {
  const res = await fetch(`${API_BASE_URL}/api/blocks`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ blockedId }),
  });
  if (!res.ok) throw new Error(`block user failed: ${res.status}`);
  return res.json();
}

/** 차단 해제 - DELETE /api/blocks/{blockedId} */
export async function unblockUser(blockedId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/blocks/${blockedId}`, {
    method: 'DELETE',
    headers: await getHeaders(),
  });
  if (!res.ok) throw new Error(`unblock failed: ${res.status}`);
}

/** 차단 여부 확인 - GET /api/blocks/check/{targetUserId} */
export async function checkBlock(targetUserId: number): Promise<BlockCheckResponse> {
  const res = await fetch(`${API_BASE_URL}/api/blocks/check/${targetUserId}`, {
    headers: await getHeaders(),
  });
  if (!res.ok) throw new Error(`check block failed: ${res.status}`);
  return res.json();
}
