import { API_BASE_URL } from '../constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = '@dailo/accessToken';
const REFRESH_TOKEN_KEY = '@dailo/refreshToken';
const USER_EMAIL_KEY = '@dailo/userEmail';
const NICKNAME_MAP_KEY = '@dailo/emailToNickname';

/** 백엔드 TokenDto (AuthController.login 응답) */
export type TokenDto = {
  grantType: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
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
  email: string;
  nickname: string;
};

/**
 * 로그인 API 호출
 * POST /api/auth/login
 * 백엔드 내부 수정 없이 기존 API 그대로 사용
 */
export async function loginApi(body: LoginRequest): Promise<TokenDto> {
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
    throw new Error(getErrorMessage(text, res.status, `로그인 실패 (${res.status})`));
  }
  return JSON.parse(text) as TokenDto;
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
    throw new Error(getErrorMessage(text, res.status, `회원가입 실패 (${res.status})`));
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
 * @returns 표시명 (저장된 닉네임 우선, 없으면 이메일 @ 앞부분)
 */
export async function login(email: string, password: string): Promise<{ name: string }> {
  const dto = await loginApi({ email: email.trim(), password });
  const trimmed = email.trim();
  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY, dto.accessToken],
    [REFRESH_TOKEN_KEY, dto.refreshToken],
    [USER_EMAIL_KEY, trimmed],
  ]);
  const nickname = await getStoredNickname(trimmed);
  const name = nickname || trimmed.split('@')[0] || trimmed || '사용자';
  return { name };
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
 * 로그아웃: 저장된 토큰·이메일 삭제 (닉네임 매핑은 유지)
 */
export async function clearAuthStorage(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_EMAIL_KEY]);
}
