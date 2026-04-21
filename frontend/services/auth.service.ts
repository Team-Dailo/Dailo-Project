import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/api';
import { createFormDataFile } from '../utils/uploadFormData';

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

/** 백엔드 회원가입 요청 (MemberRequestDto: email, password, nickname, authCode) */
export type SignupRequest = {
  email: string;
  password: string;
  nickname: string;
  authCode: string;
};

/** 백엔드 회원가입/내정보 응답 (MemberResponseDto) */
export type MemberResponseDto = {
  id?: number;
  email: string;
  nickname: string;
  role?: string;
  profileImageUrl?: string | null;
};

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
        : res.status === 403
          ? '로그인할 수 없는 계정입니다.'
          : `로그인 실패 (${res.status})`;
    throw new Error(getErrorMessage(text, res.status, fallback));
  }

  const json = JSON.parse(text) as LoginResponseDto & Record<string, unknown>;
  if (json.requiresEmailVerification) {
    const msg =
      (json.message && String(json.message).trim()) ||
      '로그인 확인 이메일을 발송했습니다. Gmail에서 확인 링크를 눌러 주세요.';
    throw new Error('EMAIL_VERIFICATION_REQUIRED:' + msg);
  }

  return json;
}

export async function sendSignupEmail(email: string): Promise<void> {
  const trimmed = email.trim();
  if (!trimmed) {
    throw new Error('이메일을 입력해 주세요.');
  }

  let res: Response;
  try {
    res = await fetch(
      `${API_BASE_URL}/api/auth/email/send?email=${encodeURIComponent(trimmed)}`,
      { method: 'POST' }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (/failed to fetch|network request failed|network error/i.test(msg)) {
      throw new Error(
        '서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해 주세요. 에뮬레이터에서는 API 주소가 10.0.2.2:8080 인지 확인하세요.'
      );
    }
    throw e;
  }

  if (!res.ok) {
    const text = await res.text();
    const fallback =
      res.status === 409
        ? '이미 가입된 이메일입니다. 다른 이메일로 시도해 주세요.'
        : `인증번호 발송에 실패했습니다. (${res.status})`;
    throw new Error(getErrorMessage(text, res.status, fallback));
  }
}

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

export async function saveNicknameForEmail(email: string, nickname: string): Promise<void> {
  const raw = await AsyncStorage.getItem(NICKNAME_MAP_KEY);
  const map: Record<string, string> = raw ? JSON.parse(raw) : {};
  map[email.trim()] = nickname.trim();
  await AsyncStorage.setItem(NICKNAME_MAP_KEY, JSON.stringify(map));
}

export async function getStoredNickname(email: string): Promise<string | null> {
  const raw = await AsyncStorage.getItem(NICKNAME_MAP_KEY);
  if (!raw) return null;
  const map = JSON.parse(raw) as Record<string, string>;
  return map[email.trim()]?.trim() || null;
}

function parseUserIdFromLoginResponse(dto: Record<string, unknown>): number | undefined {
  const raw = dto['userId'] ?? dto['user_id'] ?? dto['id'];
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
  const token =
    tokenDto && typeof tokenDto === 'object' && tokenDto !== null
      ? ((tokenDto as Record<string, unknown>).accessToken as string)
      : ((dto as Record<string, unknown>).accessToken ?? dto.accessToken);

  if (!token || typeof token !== 'string' || !token.trim()) {
    throw new Error('로그인 응답에 토큰이 없습니다. 서버 설정을 확인해 주세요.');
  }

  const raw =
    tokenDto && typeof tokenDto === 'object'
      ? (tokenDto as Record<string, unknown>)
      : (dto as Record<string, unknown>);

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

  const storageItems: [string, string][] = [[USER_EMAIL_KEY, me.email ?? '']];
  const id = me.id != null && me.id > 0 ? me.id : undefined;

  if (id != null) {
    storageItems.push([USER_ID_KEY, String(id)]);
    await setStoredUserId(id);
  }

  await AsyncStorage.multiSet(storageItems);

  const name =
    me.nickname?.trim() ||
    (await getStoredNickname(me.email ?? '')) ||
    me.email?.split('@')[0] ||
    me.email ||
    '사용자';

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

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(ACCESS_TOKEN_KEY);
}

export async function getStoredUserEmail(): Promise<string | null> {
  return AsyncStorage.getItem(USER_EMAIL_KEY);
}

export async function getStoredUserId(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(USER_ID_KEY);
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function setStoredUserId(id: number): Promise<void> {
  await AsyncStorage.setItem(USER_ID_KEY, String(id));
}

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

export async function getMe(): Promise<MemberResponseDto | null> {
  const token = await getAccessToken();
  console.log('[getMe] token exists:', !!token);

  if (!token) return null;

  try {
    const url = `${API_BASE_URL}/api/members/me?_t=${Date.now()}`;
    console.log('[getMe] request url:', url);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log('[getMe] response status:', res.status);
    console.log('[getMe] content-type:', res.headers.get('content-type'));

    const text = await res.text();
    console.log('[getMe] response text:', text);

    if (!res.ok) return null;

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      // 카카오 로그인 HTML 등 JSON 이외 응답이 오는 경우가 있어도 앱이 크래시 나지 않도록 경고만 남기고 조용히 무시
      console.log('[getMe] non-JSON response, skipping me update');
      return null;
    }

    const json = JSON.parse(text) as MemberResponseDto;
    console.log('[getMe] response json:', json);
    return json;
  } catch (e) {
    console.error('[getMe] fetch error:', e);
    return null;
  }
}

export async function updateNickname(newNickname: string): Promise<MemberResponseDto> {
  const trimmed = newNickname.trim();
  if (!trimmed) throw new Error('닉네임을 입력해 주세요.');
  return updateProfile({ nickname: trimmed });
}

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
    const msg =
      (json as { message?: string }).message ||
      (res.status === 401 ? '로그인이 필요합니다.' : `변경 실패 (${res.status})`);
    throw new Error(msg);
  }

  return JSON.parse(text) as MemberResponseDto;
}

export async function uploadProfileImage(imageUri: string): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('로그인이 필요합니다.');

  const formData = new FormData();
  formData.append('file', createFormDataFile(imageUri, 'profile.jpg') as unknown as Blob);

  const res = await fetch(`${API_BASE_URL}/api/members/me/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('로그인이 필요합니다.');
    throw new Error(`업로드 실패: ${res.status}`);
  }

  const data = (await res.json()) as { imageUrl?: string };
  const url = data?.imageUrl ?? '';
  if (!url) throw new Error('업로드 응답에 imageUrl이 없습니다.');
  return url;
}

export type MemberProfileDto = {
  id: number;
  nickname: string;
  profileImageUrl?: string | null;
  postCount: number;
  receivedLikeCount: number;
};

export async function getMemberProfile(memberId: number): Promise<MemberProfileDto | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/members/${memberId}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data as MemberProfileDto;
  } catch {
    return null;
  }
}

export async function getKakaoNativeTokenDto(kakaoAccessToken: string): Promise<TokenDto> {
  console.log('[getKakaoNativeTokenDto] API_BASE_URL:', API_BASE_URL);
  console.log('[getKakaoNativeTokenDto] request url:', `${API_BASE_URL}/api/auth/kakao/native`);
  console.log('[getKakaoNativeTokenDto] accessToken exists:', !!kakaoAccessToken);
  console.log('[getKakaoNativeTokenDto] accessToken length:', kakaoAccessToken?.length ?? 0);

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/auth/kakao/native`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: kakaoAccessToken }),
    });
  } catch (e) {
    console.error('[getKakaoNativeTokenDto] fetch error:', e);
    const msg = e instanceof Error ? e.message : '';
    if (/failed to fetch|network request failed|network error/i.test(msg)) {
      throw new Error(
        '서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해 주세요. 에뮬레이터에서는 API 주소가 10.0.2.2:8080 인지 확인하세요.'
      );
    }
    throw e;
  }

  console.log('[getKakaoNativeTokenDto] response status:', res.status);

  const text = await res.text();
  console.log('[getKakaoNativeTokenDto] response text:', text);

  if (!res.ok) {
    throw new Error(getErrorMessage(text, res.status, '카카오 로그인에 실패했습니다.'));
  }

  const parsed = JSON.parse(text) as TokenDto;
  console.log('[getKakaoNativeTokenDto] parsed success:', parsed);
  return parsed;
}

export async function loginWithSocialToken(
  tokenDto: TokenDto
): Promise<{ name: string; id?: number; email: string; role?: string; profileImageUrl?: string | null }> {
  const accessToken = tokenDto.accessToken;
  const refreshToken = tokenDto.refreshToken ?? '';

  console.log('[loginWithSocialToken] start');
  console.log('[loginWithSocialToken] accessToken exists:', !!accessToken);
  console.log('[loginWithSocialToken] refreshToken exists:', !!refreshToken);

  if (!accessToken || !accessToken.trim()) {
    throw new Error('로그인 응답에 액세스 토큰이 없습니다.');
  }

  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY, String(accessToken)],
    [REFRESH_TOKEN_KEY, String(refreshToken)],
  ]);

  console.log('[loginWithSocialToken] token stored, calling getMe');

  const me = await getMe();
  console.log('[loginWithSocialToken] getMe result:', me);

  if (!me || !me.email) {
    throw new Error('회원 정보를 불러올 수 없습니다.');
  }

  const email = me.email;
  const id = me.id != null && me.id > 0 ? me.id : undefined;

  const storageItems: [string, string][] = [[USER_EMAIL_KEY, email]];
  if (id != null) {
    storageItems.push([USER_ID_KEY, String(id)]);
    await setStoredUserId(id);
  }
  await AsyncStorage.multiSet(storageItems);

  const name =
    (me.nickname && me.nickname.trim()) ||
    (await getStoredNickname(email)) ||
    email.split('@')[0] ||
    email ||
    '사용자';

  await saveNicknameForEmail(email, name);

  const profileImageUrl = (me as { profileImageUrl?: string | null }).profileImageUrl ?? null;

  return {
    name,
    id,
    email,
    role: me.role ?? undefined,
    profileImageUrl,
  };
}

/** Apple 로그인 요청 DTO */
export type AppleLoginRequest = {
  identityToken: string;
  user: string;
  fullName?: string | null;
  email?: string | null;
};

/**
 * Apple 로그인 - identityToken을 백엔드로 전송하여 JWT 발급
 */
export async function getAppleTokenDto(request: AppleLoginRequest): Promise<TokenDto> {
  console.log('[getAppleTokenDto] API_BASE_URL:', API_BASE_URL);
  console.log('[getAppleTokenDto] request url:', `${API_BASE_URL}/api/auth/apple`);
  console.log('[getAppleTokenDto] identityToken exists:', !!request.identityToken);
  console.log('[getAppleTokenDto] user:', request.user?.substring(0, 20) + '...');

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/auth/apple`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  } catch (e) {
    console.error('[getAppleTokenDto] fetch error:', e);
    const msg = e instanceof Error ? e.message : '';
    if (/failed to fetch|network request failed|network error/i.test(msg)) {
      throw new Error('서버에 연결할 수 없습니다. 네트워크 연결을 확인해 주세요.');
    }
    throw e;
  }

  console.log('[getAppleTokenDto] response status:', res.status);

  const text = await res.text();
  console.log('[getAppleTokenDto] response text:', text);

  if (!res.ok) {
    throw new Error(getErrorMessage(text, res.status, 'Apple 로그인에 실패했습니다.'));
  }

  const parsed = JSON.parse(text) as TokenDto;
  console.log('[getAppleTokenDto] parsed success:', parsed);
  return parsed;
}

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

export async function clearAuthStorage(): Promise<void> {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_EMAIL_KEY, USER_ID_KEY]);
}