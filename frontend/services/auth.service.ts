import { API_BASE_URL } from '../constants/api';
import AsyncStorage from './storageFallback';

const ACCESS_TOKEN_KEY = '@dailo/accessToken';
const REFRESH_TOKEN_KEY = '@dailo/refreshToken';
const USER_EMAIL_KEY = '@dailo/userEmail';
const USER_ID_KEY = '@dailo/userId';
const NICKNAME_MAP_KEY = '@dailo/emailToNickname';

/** 백엔드 TokenDto */
export type TokenDto = {
  grantType: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
};

/** 백엔드 로그인 응답 (토큰 + 닉네임 + 회원 id) */
export type LoginResponseDto = TokenDto & {
  nickname: string;
  userId?: number;
};

/** 백엔드 로그인 요청 (LoginRequestDto: email, password) */
export type LoginRequest = {
  email: string;
  password: string;
};

/** 백엔드 회원가입 요청 (MemberRequestDto: email, password, nickname) */
export type SignupRequest = {
  email: string;
  password: string;
  nickname: string;
};

/** 백엔드 회원가입 응답 (MemberResponseDto) */
export type MemberResponseDto = {
  id?: number;
  email: string;
  nickname: string;
};

/**
 * 로그인 API 호출
 * POST /api/auth/login - 토큰 + 닉네임 반환
 */
export async function loginApi(body: LoginRequest): Promise<LoginResponseDto> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (/failed to fetch|network request failed|network error/i.test(msg)) {
      throw new Error(
        '서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해 주세요. 에뮬레이터에서는 API 주소가 10.0.2.2:8080 인지 확인하세요.'
      );
    }
    throw e;
  }
  const text = await res.text();
  if (!res.ok) {
    const fallback =
      res.status === 401
        ? '이메일 또는 비밀번호가 올바르지 않습니다.'
        : `로그인 실패 (${res.status})`;
    throw new Error(getErrorMessage(text, res.status, fallback));
  }
  return JSON.parse(text) as LoginResponseDto;
}

/**
 * 백엔드 에러 응답에서 메시지 추출 (Spring Boot JSON 형식)
 */
function getErrorMessage(text: string, status: number, fallback: string): string {
  try {
    const json = JSON.parse(text) as { message?: string; error?: string };
    if (typeof json.message === 'string' && json.message.trim()) return json.message;
    if (typeof json.error === 'string' && json.error.trim()) return json.error;
  } catch {
    // not JSON
  }
  if (text.trim()) return text;
  return fallback;
}

/**
 * 회원가입 API 호출
 * POST /api/auth/signup
 */
export async function signupApi(body: SignupRequest): Promise<MemberResponseDto> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (/failed to fetch|network request failed|network error/i.test(msg)) {
      throw new Error(
        '서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해 주세요. 에뮬레이터에서는 API 주소가 10.0.2.2:8080 인지 확인하세요.'
      );
    }
    throw e;
  }
  const text = await res.text();
  if (!res.ok) {
    const fallback =
      res.status === 409
        ? '이미 가입되어 있는 이메일입니다.'
        : `회원가입 실패 (${res.status})`;
    throw new Error(getErrorMessage(text, res.status, fallback));
  }
  return JSON.parse(text) as MemberResponseDto;
}

/**
 * 회원가입 시 이메일–닉네임 매핑 저장 (프로필 표시용)
 */
export async function saveNicknameForEmail(email: string, nickname: string): Promise<void> {
  const raw = await AsyncStorage.getItem(NICKNAME_MAP_KEY);
  const map: Record<string, string> = raw ? JSON.parse(raw) : {};
  map[email.trim()] = nickname.trim();
  await AsyncStorage.setItem(NICKNAME_MAP_KEY, JSON.stringify(map));
}

/**
 * 저장된 닉네임 반환 (없으면 null)
 */
export async function getStoredNickname(email: string): Promise<string | null> {
  const raw = await AsyncStorage.getItem(NICKNAME_MAP_KEY);
  if (!raw) return null;
  const map = JSON.parse(raw) as Record<string, string>;
  return map[email.trim()]?.trim() || null;
}

/**
 * 로그인 처리: API 호출 후 토큰·이메일 저장
 * @returns 표시명 + 회원 id (게시판 기록 등에서 사용)
 */
export async function login(email: string, password: string): Promise<{ name: string; id?: number }> {
  const dto = await loginApi({ email: email.trim(), password });
  const trimmed = email.trim();
  const storageItems: [string, string][] = [
    [ACCESS_TOKEN_KEY, dto.accessToken],
    [REFRESH_TOKEN_KEY, dto.refreshToken],
    [USER_EMAIL_KEY, trimmed],
  ];
  if (dto.userId != null && dto.userId > 0) {
    storageItems.push([USER_ID_KEY, String(dto.userId)]);
  }
  await AsyncStorage.multiSet(storageItems);
  const name =
    (dto.nickname && dto.nickname.trim()) ||
    (await getStoredNickname(trimmed)) ||
    trimmed.split('@')[0] ||
    trimmed ||
    '사용자';
  const id = dto.userId != null && dto.userId > 0 ? dto.userId : undefined;
  return { name, id };
}

/**
 * 저장된 액세스 토큰 반환 (다른 API 호출 시 Authorization 헤더에 사용)
 */
export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

/**
 * 저장된 사용자 이메일 반환 (복원 시 표시명 생성용)
 */
export async function getStoredUserEmail(): Promise<string | null> {
  return AsyncStorage.getItem(USER_EMAIL_KEY);
}

/**
 * 저장된 회원 id 반환 (getMe 실패 시 게시판 기록 등에서 사용)
 */
export async function getStoredUserId(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(USER_ID_KEY);
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * 회원 id 저장 (getMe 성공 시 호출해 두면 이후 getMe 실패 시에도 id 사용 가능)
 */
export async function setStoredUserId(id: number): Promise<void> {
  await AsyncStorage.setItem(USER_ID_KEY, String(id));
}

/**
 * 내 정보 조회 (JWT 필요) - 백엔드 DB의 이메일·닉네임 반환
 * 앱 재시작 후에도 닉네임을 올바르게 표시할 수 있음
 */
export async function getMe(): Promise<MemberResponseDto | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return (await res.json()) as MemberResponseDto;
  } catch {
    return null;
  }
}

/**
 * 닉네임 변경 (JWT 필요)
 * @throws Error 서버 오류 또는 유효성 실패 시
 */
export async function updateNickname(newNickname: string): Promise<MemberResponseDto> {
  const token = await getAccessToken();
  if (!token) throw new Error('로그인이 필요합니다.');
  const trimmed = newNickname.trim();
  if (!trimmed) throw new Error('닉네임을 입력해 주세요.');
  const res = await fetch(`${API_BASE_URL}/api/auth/me/nickname`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ nickname: trimmed }),
  });
  const text = await res.text();
  if (!res.ok) {
    const json = text ? (() => { try { return JSON.parse(text); } catch { return {}; } })() : {};
    const msg = (json as { message?: string }).message || (res.status === 401 ? '로그인이 필요합니다.' : `변경 실패 (${res.status})`);
    throw new Error(msg);
  }
  return JSON.parse(text) as MemberResponseDto;
}

/**
 * 로그아웃: 저장된 토큰·이메일·회원 id 삭제 (닉네임 매핑은 유지)
 */
export async function clearAuthStorage(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_EMAIL_KEY, USER_ID_KEY]);
}
