import { API_BASE_URL } from '../constants/api';
import * as authService from './auth.service';

const getDefaultUserId = (): number => {
  const id = process.env.EXPO_PUBLIC_USER_ID;
  if (id != null && id !== '') return Number(id);
  return 1;
};

const getHeaders = async (): Promise<HeadersInit> => {
  const token = await authService.getAccessToken();
  let id = await authService.getStoredUserId();
  if (id == null && token) {
    const me = await authService.getMe();
    if (me?.id != null && me.id > 0) {
      id = me.id;
      await authService.setStoredUserId(me.id);
    }
  }
  id = id ?? getDefaultUserId();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-User-Id': String(id),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export type ChatMember = {
  id: number;
  userId: number;
  /** 채팅 목록에서 표시할 상대방 닉네임 (백엔드에서 조회) */
  nickname?: string | null;
  joinedAt: string;
  lastReadAt?: string;
};

export type ChatRoomResponse = {
  id: number;
  roomType: string;
  members: ChatMember[];
  createdAt: string;
  updatedAt: string;
};

export type ChatMessageResponse = {
  id: number;
  roomId: number;
  senderId: number;
  content: string;
  messageType: string;
  createdAt: string;
};

/** 채팅방 생성 - POST /api/chat/rooms (로그인 필요) */
export async function createRoom(targetUserId: number): Promise<ChatRoomResponse> {
  const headers = await getHeaders();
  const res = await fetch(`${API_BASE_URL}/api/chat/rooms`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ targetUserId }),
  });
  if (!res.ok) {
    const status = res.status;
    let msg = `채팅방을 만들 수 없습니다. (${status})`;
    if (status === 401) msg = '로그인이 만료되었을 수 있습니다. 로그아웃 후 다시 로그인해 주세요.';
    else {
      try {
        const text = await res.text();
        const parsed = text ? JSON.parse(text) : null;
        const detail = parsed?.message ?? parsed?.error ?? (parsed?.msg ?? text);
        if (detail && typeof detail === 'string' && detail.length < 120) msg = detail;
      } catch {
        // ignore
      }
    }
    throw new Error(msg);
  }
  return res.json();
}

/** 내 채팅방 목록 - GET /api/chat/rooms */
export async function getMyRooms(): Promise<ChatRoomResponse[]> {
  const res = await fetch(`${API_BASE_URL}/api/chat/rooms`, {
    headers: await getHeaders(),
  });
  if (!res.ok) throw new Error(`get rooms failed: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/** 채팅방 상세 - GET /api/chat/rooms/{roomId} */
export async function getRoom(roomId: number): Promise<ChatRoomResponse> {
  const res = await fetch(`${API_BASE_URL}/api/chat/rooms/${roomId}`, {
    headers: await getHeaders(),
  });
  if (!res.ok) throw new Error(`get room failed: ${res.status}`);
  return res.json();
}

/** 채팅방 나가기 - DELETE /api/chat/rooms/{roomId} */
export async function leaveRoom(roomId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/chat/rooms/${roomId}`, {
    method: 'DELETE',
    headers: await getHeaders(),
  });
  if (!res.ok) throw new Error(`leave room failed: ${res.status}`);
}

/** 메시지 목록 - GET /api/chat/rooms/{roomId}/messages */
export async function getMessages(
  roomId: number,
  params?: { page?: number; size?: number }
): Promise<{ content: ChatMessageResponse[]; totalElements: number }> {
  const page = params?.page ?? 0;
  const size = params?.size ?? 50;
  const res = await fetch(
    `${API_BASE_URL}/api/chat/rooms/${roomId}/messages?page=${page}&size=${size}`,
    { headers: await getHeaders() }
  );
  if (!res.ok) throw new Error(`get messages failed: ${res.status}`);
  return res.json();
}

/** 메시지 전송 - POST /api/chat/rooms/{roomId}/messages */
export async function sendMessage(
  roomId: number,
  content: string
): Promise<ChatMessageResponse> {
  const res = await fetch(`${API_BASE_URL}/api/chat/rooms/${roomId}/messages`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ content, messageType: 'TEXT' }),
  });
  if (!res.ok) throw new Error(`send message failed: ${res.status}`);
  return res.json();
}
