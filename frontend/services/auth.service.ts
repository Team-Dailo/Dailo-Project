import { API_BASE_URL } from '../constants/api';
import { createFormDataFile } from '../utils/uploadFormData';
import AsyncStorage from './storageFallback';

const ACCESS_TOKEN_KEY = '@dailo/accessToken';
const REFRESH_TOKEN_KEY = '@dailo/refreshToken';
const USER_EMAIL_KEY = '@dailo/userEmail';
const USER_ID_KEY = '@dailo/userId';
const NICKNAME_MAP_KEY = '@dailo/emailToNickname';

/** 이 이메일로 로그인한 경우 마이페이지에 관리자 메뉴 표시 (백엔드 app.admin.emails와 동일하게) */
export const ADMIN_EMAIL = 'yunajo5858@gmail.com';

/** 백엔드 TokenDto */
export type TokenDto = {
  grantType: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
};

/** 백엔드 로그인 응답 (일반: tokenDto 있음 / 이메일 확인 필요: requiresEmailVerification true) */
export type LoginResponseDto = (TokenDto & { nickname?: string; userId?: number }) & {
  tokenDto?: TokenDto | null;
  requiresEmailVerification?: boolean;
  message?: string | null;
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

/** 백엔드 회원가입/내정보 응답 (MemberResponseDto) */
export type MemberResponseDto = {
  id?: number;
  email: string;
  nickname: string;
  /** USER | ADMIN - 마이페이지 관리자 메뉴 노출 여부 */
  role?: string;
  /** 프로필 사진 URL (내정보 조회 시) */
  profileImageUrl?: string | null;
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
  const json = JSON.parse(text) as LoginResponseDto & Record<string, unknown>;
  if (json.requiresEmailVerification) {
    const msg = (json.message && String(json.message).trim()) || '로그인 확인 이메일을 발송했습니다. Gmail에서 확인 링크를 눌러 주세요.';
    throw new Error('EMAIL_VERIFICATION_REQUIRED:' + msg);
  }
  return json;
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
        ? '이미 가입된 이메일입니다. 다른 이메일로 시도해 주세요.'
        : res.status === 400
          ? '입력 형식이 올바르지 않습니다. 이메일·비밀번호·닉네임을 확인해 주세요.'
          : res.status === 403
            ? '정지된 계정이거나 접근이 제한된 상태입니다. 로그아웃 후 다시 시도하거나 문의해 주세요.'
            : `회원가입에 실패했습니다. (${res.status})`;
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
/** 로그인 응답 JSON에서 회원 id 추출 (userId / user_id / id 모두 확인) */
function parseUserIdFromLoginResponse(dto: Record<string, unknown>): number | undefined {
  const raw =
    dto['userId'] ?? dto['user_id'] ?? dto['id'];
  const n = typeof raw === 'number' ? raw : Number(raw);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export async function login(
  email: string,
  password: string
): Promise<{ name: string; id?: number; email: string }> {
  const dto = await loginApi({ email: email.trim(), password });
  const trimmed = email.trim();
  const tokenDto = (dto as Record<string, unknown>).tokenDto ?? (dto.accessToken ? dto : null);
  const token = tokenDto && typeof tokenDto === 'object' && tokenDto !== null
    ? (tokenDto as Record<string, unknown>).accessToken as string
    : (dto as Record<string, unknown>).accessToken ?? dto.accessToken;
  if (!token || typeof token !== 'string' || !token.trim()) {
    throw new Error('로그인 응답에 토큰이 없습니다. 서버 설정을 확인해 주세요.');
  }
  const raw = tokenDto && typeof tokenDto === 'object' ? (tokenDto as Record<string, unknown>) : (dto as Record<string, unknown>);
  const refresh = (raw.refreshToken as string) ?? '';
  const dtoAny = dto as Record<string, unknown>;
  const id = parseUserIdFromLoginResponse(dtoAny);

  const storageItems: [string, string][] = [
    [ACCESS_TOKEN_KEY, String(token)],
    [REFRESH_TOKEN_KEY, refresh],
    [USER_EMAIL_KEY, trimmed],
  ];
  if (id != null && id > 0) {
    storageItems.push([USER_ID_KEY, String(id)]);
  }
  await AsyncStorage.multiSet(storageItems);
  if (id != null && id > 0) {
    await setStoredUserId(id);
  } else {
    await AsyncStorage.removeItem(USER_ID_KEY);
  }
  const name =
    (dto.nickname && dto.nickname.trim()) ||
    (await getStoredNickname(trimmed)) ||
    trimmed.split('@')[0] ||
    trimmed ||
    '사용자';
  await saveNicknameForEmail(trimmed, name);
  return { name, id, email: trimmed };
}

/** 이메일 확인 링크에서 받은 토큰으로 로그인 완료 (딥링크용) */
export async function exchangeLoginToken(
  oneTimeToken: string
): Promise<{ name: string; id?: number; email: string; role?: string; profileImageUrl?: string | null }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/exchange-login-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: oneTimeToken }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(getErrorMessage(text, res.status, '로그인 확인이 만료되었거나 이미 사용된 링크입니다.'));
  }
  const tokenDto = JSON.parse(text) as TokenDto;
  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY, tokenDto.accessToken],
    [REFRESH_TOKEN_KEY, tokenDto.refreshToken ?? ''],
  ]);
  const me = await getMe();
  if (!me) {
    throw new Error('회원 정보를 불러올 수 없습니다.');
  }
  const storageItems: [string, string][] = [
    [USER_EMAIL_KEY, me.email ?? ''],
  ];
  const id = me.id != null && me.id > 0 ? me.id : undefined;
  if (id != null) {
    storageItems.push([USER_ID_KEY, String(id)]);
    await setStoredUserId(id);
  }
  await AsyncStorage.multiSet(storageItems);
  const name = me.nickname?.trim() || (await getStoredNickname(me.email ?? '')) || me.email?.split('@')[0] || me.email || '사용자';
  await saveNicknameForEmail(me.email ?? '', name);
  const profileImageUrl = (me as { profileImageUrl?: string | null }).profileImageUrl;
  return {
    name,
    id,
    email: me.email ?? '',
    role: me.role ?? undefined,
    profileImageUrl: profileImageUrl ?? undefined,
  };
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
 * 게시판 API와 동일한 "현재 사용자 id" (저장값 없으면 1).
 * 수정 버튼/게시판 기록에서 id를 못 가져올 때 이 값으로 맞춤.
 */
export async function getEffectiveUserId(): Promise<number> {
  const stored = await getStoredUserId();
  if (stored != null && stored > 0) return stored;
  const envId = process.env.EXPO_PUBLIC_USER_ID;
  if (envId != null && envId !== '') {
    const n = Number(envId);
    if (Number.isInteger(n) && n > 0) return n;
  }
  return 1;
}

/**
 * 내 정보 조회 (JWT 필요) - 백엔드 DB의 이메일·닉네임 반환
 * 앱 재시작 후에도 닉네임을 올바르게 표시할 수 있음
 */
export async function getMe(): Promise<MemberResponseDto | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/members/me`, {
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
  const trimmed = newNickname.trim();
  if (!trimmed) throw new Error('닉네임을 입력해 주세요.');
  return updateProfile({ nickname: trimmed });
}

/**
 * 프로필 수정 (닉네임·프로필 사진 URL). 보내지 않은 필드는 서버에서 유지됨.
 * @throws Error 서버 오류 또는 유효성 실패 시
 */
export async function updateProfile(updates: {
  nickname?: string;
  profileImageUrl?: string | null;
}): Promise<MemberResponseDto> {
  const token = await getAccessToken();
  if (!token) throw new Error('로그인이 필요합니다.');
  const body: Record<string, unknown> = {};
  if (updates.nickname !== undefined) body.nickname = updates.nickname.trim();
  if (updates.profileImageUrl !== undefined) body.profileImageUrl = updates.profileImageUrl ?? null;
  if (Object.keys(body).length === 0) throw new Error('변경할 내용이 없습니다.');
  const res = await fetch(`${API_BASE_URL}/api/members/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
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
 * 프로필 사진 업로드 (POST /api/upload). 반환된 전체 URL을 updateProfile({ profileImageUrl })에 넣으면 됨.
 */
export async function uploadProfileImage(imageUri: string): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('로그인이 필요합니다.');
  const formData = new FormData();
  formData.append('file', createFormDataFile(imageUri, 'profile.jpg') as unknown as Blob);
  const res = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('로그인이 필요합니다.');
    throw new Error(`업로드 실패: ${res.status}`);
  }
  const data = (await res.json()) as { path?: string };
  const path = data?.path ?? '';
  if (!path) throw new Error('업로드 응답에 path가 없습니다.');
  return `${API_BASE_URL}${path}`;
}

/**
 * 계정 탈퇴 및 데이터 삭제 (DELETE /api/members/me)
 * 성공 시 호출 측에서 clearAuthStorage + 로그아웃 처리 필요
 */
export async function withdrawApi(): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('로그인이 필요합니다.');
  const res = await fetch(`${API_BASE_URL}/api/members/me`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(getErrorMessage(text, res.status, '계정 탈퇴에 실패했습니다.'));
  }
}

/**
 * 로그아웃: 저장된 토큰·이메일·회원 id 삭제 (닉네임 매핑은 유지)
 */
export async function clearAuthStorage(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_EMAIL_KEY, USER_ID_KEY]);
}
