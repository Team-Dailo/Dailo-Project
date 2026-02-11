// services/chat.service.ts
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "@/constants/api";

// ✅ 너희 백엔드에 맞게 여기만 맞추면 됨
const ROOMS_PATH = "/api/chat/rooms";

// ✅ roomId에 "/" 같은 이상한 값이 섞여도 절대 URL이 깨지지 않게 정리
const normalizeRoomId = (roomId: string) => String(roomId).replace(/\//g, "").trim();

// ✅ 경로 조합을 한 방식으로 통일 (// 방지)
const MESSAGES_PATH = (roomId: string) => `${ROOMS_PATH}/${normalizeRoomId(roomId)}/messages`;
const SEND_PATH = (roomId: string) => `${ROOMS_PATH}/${normalizeRoomId(roomId)}/messages`; // 서버가 POST 지원하면

export type ChatRoom = {
  id: string | number;
  participants?: { id: string | number; name?: string }[];
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
};

export type ChatMessage = {
  id: string;
  senderId?: string;
  text: string;
  createdAt: string;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

const USER_ID_KEY = "userId";
const AUTH_TOKEN_KEY = "authToken";

/** ✅ userId 저장/조회 */
export async function getUserId() {
  return (await AsyncStorage.getItem(USER_ID_KEY)) ?? null;
}
export async function setUserId(id: string) {
  await AsyncStorage.setItem(USER_ID_KEY, id);
}

/** ✅ 토큰 저장/조회 */
export async function getAuthToken() {
  return (await AsyncStorage.getItem(AUTH_TOKEN_KEY)) ?? null;
}
export async function setAuthToken(token: string) {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
}

/** ✅ 모든 요청에 헤더 + 요청 URL 로그 */
api.interceptors.request.use(async (config) => {
  const uid = (await getUserId()) ?? "";
  const token = (await getAuthToken()) ?? "";

  config.headers = config.headers ?? {};

  if (uid) config.headers["X-User-Id"] = uid;
  if (token) config.headers["Authorization"] = `Bearer ${token}`;

  // ✅ 방탄: config.url에 // 가 섞여도 강제로 정리
  if (typeof config.url === "string") {
    config.url = config.url.replace(/\/{2,}/g, "/");
  }

  console.log("X-User-Id =", uid);
  console.log(
    "➡️ API REQUEST:",
    config.method?.toUpperCase(),
    `${config.baseURL}${config.url}`
  );

  return config;
});

/** ✅ 응답 에러 로그 */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const data = err?.response?.data;
    console.log("❌ API ERROR:", status, data ?? err?.message);
    throw err;
  }
);

/** ✅ 채팅방 목록 */
export async function getChatRooms(): Promise<ChatRoom[]> {
  const res = await api.get(ROOMS_PATH);
  return Array.isArray(res.data) ? res.data : [];
}

/** ✅ 메시지 목록 */
export async function getMessages(roomId: string): Promise<any> {
  // 백엔드가 Page 형태로 줄 수 있어서 여기서는 raw로 반환
  // (ChatRoomScreen에서 Array / data.content 둘 다 처리 중)
  const res = await api.get(MESSAGES_PATH(roomId));
  return res.data;
}

/** ✅ 메시지 전송(REST fallback) */
export async function sendMessage(roomId: string, text: string) {
  const res = await api.post(SEND_PATH(roomId), { text });
  return res.data;
}

/** UI helper */
export function getRoomTitle(room: ChatRoom, myUserId: string) {
  const ps = room.participants ?? [];
  const other = ps.find((p) => String(p.id) !== String(myUserId));
  return other?.name ?? "채팅";
}

export function getRoomAvatarSeed(room: ChatRoom, myUserId: string) {
  const title = getRoomTitle(room, myUserId);
  return `${room.id}-${title}`;
}

export function formatKoreanTime(iso?: string) {
  if (!iso) return "";
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  const diff = Date.now() - t.getTime();
  const m = Math.max(1, Math.floor(diff / 60000));
  if (m < 60) return `${m}분전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간전`;
  const d = Math.floor(h / 24);
  return `${d}일전`;
}
