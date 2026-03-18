import { API_BASE_URL } from '../constants/api';
import { createFormDataFile } from '../utils/uploadFormData';
import { getAccessToken, getStoredUserId, getMe, setStoredUserId } from './auth.service';
import type {
  PostListItem,
  PostDetail,
  PostRequest,
  CommentItem,
  CommentRequest,
  PageResponse,
} from '../types/board';

/** 기본 헤더 (조회용) */
const getHeaders = (): HeadersInit => {
  return { 'Content-Type': 'application/json' };
};

/** 인증 헤더 (작성/수정/삭제용) - JWT + X-User-Id. 차단한 사용자 글 미노출 등에 사용 */
const getAuthHeaders = async (): Promise<HeadersInit> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = await getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  let userId = await getStoredUserId();
  if (userId == null && token) {
    const me = await getMe();
    if (me?.id != null && me.id > 0) {
      await setStoredUserId(me.id);
      userId = me.id;
    }
  }
  if (userId != null) {
    headers['X-User-Id'] = String(userId);
  }
  return headers;
};

/** 게시글 목록 (전체, 정렬: 최신/인기) - 로그인 시 X-User-Id 전달하여 liked 표시 */
export async function getPostList(params?: {
  page?: number;
  size?: number;
  sort?: 'createdAt' | 'likeCount';
  direction?: 'ASC' | 'DESC';
}): Promise<PageResponse<PostListItem>> {
  const page = params?.page ?? 0;
  const size = params?.size ?? 20;
  const sort = params?.sort ?? 'createdAt';
  const direction = params?.direction ?? 'DESC';
  const url = `${API_BASE_URL}/api/posts?page=${page}&size=${size}&sort=${sort}&direction=${direction}`;
  const res = await fetch(url, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error(`getPostList failed: ${res.status}`);
  const data = await res.json();
  return normalizeListImageUrls(data);
}

/** 카테고리별 게시글 목록 - 로그인 시 liked 표시 */
export async function getPostListByCategory(
  categoryType: string,
  params?: { page?: number; size?: number }
): Promise<PageResponse<PostListItem>> {
  const page = params?.page ?? 0;
  const size = params?.size ?? 20;
  const url = `${API_BASE_URL}/api/posts/category/${encodeURIComponent(categoryType)}?page=${page}&size=${size}`;
  const res = await fetch(url, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error(`getPostListByCategory failed: ${res.status}`);
  const data = await res.json();
  return normalizeListImageUrls(data);
}

/** 행사별 후기 목록 (해당 행사에 연결된 게시글) */
export async function getPostsByEventId(
  eventId: number,
  params?: { page?: number; size?: number }
): Promise<PageResponse<PostListItem>> {
  const page = params?.page ?? 0;
  const size = params?.size ?? 20;
  const url = `${API_BASE_URL}/api/posts/event/${eventId}?page=${page}&size=${size}`;
  const res = await fetch(url, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error(`getPostsByEventId failed: ${res.status}`);
  const data = await res.json();
  return normalizeListImageUrls(data);
}

/** 게시글 검색 - 로그인 시 liked 표시 */
export async function searchPosts(
  keyword: string,
  params?: { page?: number; size?: number }
): Promise<PageResponse<PostListItem>> {
  const page = params?.page ?? 0;
  const size = params?.size ?? 20;
  const url = `${API_BASE_URL}/api/posts/search?keyword=${encodeURIComponent(keyword)}&page=${page}&size=${size}`;
  const res = await fetch(url, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error(`searchPosts failed: ${res.status}`);
  const data = await res.json();
  return normalizeListImageUrls(data);
}

/** 좋아요 누른 글 목록 (마이페이지) - 인증 필요 */
export async function getLikedPosts(params?: {
  page?: number;
  size?: number;
}): Promise<PageResponse<PostListItem>> {
  const page = params?.page ?? 0;
  const size = params?.size ?? 20;
  const url = `${API_BASE_URL}/api/posts/liked?page=${page}&size=${size}`;
  const res = await fetch(url, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error(`getLikedPosts failed: ${res.status}`);
  const data = await res.json();
  return normalizeListImageUrls(data);
}

/** 댓글 단 글 목록 (마이페이지) - 인증 필요 */
export async function getMyCommentedPosts(params?: {
  page?: number;
  size?: number;
}): Promise<PageResponse<PostListItem>> {
  const page = params?.page ?? 0;
  const size = params?.size ?? 20;
  const url = `${API_BASE_URL}/api/posts/commented?page=${page}&size=${size}`;
  const res = await fetch(url, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error(`getMyCommentedPosts failed: ${res.status}`);
  const data = await res.json();
  return normalizeListImageUrls(data);
}

/** 내가 쓴 글 목록 (마이페이지 게시판 기록) - 인증 필요, 서버가 JWT로 본인 식별 */
export async function getMyPosts(
  _userId?: number | null,
  params?: { page?: number; size?: number }
): Promise<PageResponse<PostListItem>> {
  const page = params?.page ?? 0;
  const size = params?.size ?? 20;
  const url = `${API_BASE_URL}/api/posts/my?page=${page}&size=${size}`;
  const res = await fetch(url, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error(`getMyPosts failed: ${res.status}`);
  const data = await res.json();
  return normalizeListImageUrls(data);
}

/** 특정 사용자의 게시글 목록 (공개 조회) */
export async function getPostsByMemberId(
  memberId: number,
  params?: { page?: number; size?: number }
): Promise<PageResponse<PostListItem>> {
  const page = params?.page ?? 0;
  const size = params?.size ?? 20;
  const url = `${API_BASE_URL}/api/posts/member/${memberId}?page=${page}&size=${size}`;
  const res = await fetch(url, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error(`getPostsByMemberId failed: ${res.status}`);
  const data = await res.json();
  return normalizeListImageUrls(data);
}

/** 상대 경로 이미지 URL을 API 기준으로 절대 URL로 변환 */
function toAbsoluteImageUrls(urls: string[] | undefined): string[] {
  if (!urls || !Array.isArray(urls)) return [];
  return urls.map((u) => (typeof u === 'string' && u.startsWith('/') ? `${API_BASE_URL}${u}` : u));
}

/** 목록 응답의 각 게시글 imageUrls를 절대 URL로 보정 (비로그인 포함 모든 사용자에게 게시판 사진 노출) */
function normalizeListImageUrls<T extends { imageUrls?: string[]; image_urls?: string[] }>(data: PageResponse<T>): PageResponse<T> {
  const content = data.content ?? [];
  const normalized = content.map((item) => {
    const raw = item as Record<string, unknown>;
    const urls = (raw.imageUrls ?? raw.image_urls) as string[] | undefined;
    if (urls && Array.isArray(urls)) {
      return { ...item, imageUrls: toAbsoluteImageUrls(urls) };
    }
    return item;
  });
  return { ...data, content: normalized };
}

/** 게시글 상세 - 비로그인도 조회·사진 보기 가능. 로그인 시 isLiked 표시. imageUrls가 상대 경로면 절대 URL로 보정 */
export async function getPostById(id: number | string): Promise<PostDetail> {
  const url = `${API_BASE_URL}/api/posts/${id}`;
  const res = await fetch(url, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error(`getPostById failed: ${res.status}`);
  const data = (await res.json()) as PostDetail & { image_urls?: string[] };
  const rawUrls = data.imageUrls ?? data.image_urls;
  if (rawUrls && Array.isArray(rawUrls)) {
    (data as PostDetail).imageUrls = toAbsoluteImageUrls(rawUrls);
  }
  return data as PostDetail;
}

/** 게시글 사진 업로드 (로그인 필요). 로컬 URI → 서버 저장 후 접근 URL 반환 */
export async function uploadPostImage(imageUri: string): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('로그인이 필요합니다.');
  const formData = new FormData();
  formData.append('file', createFormDataFile(imageUri, 'photo.jpg') as unknown as Blob);
  const res = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('로그인이 필요합니다');
    throw new Error(`업로드 실패: ${res.status}`);
  }
  const data = (await res.json()) as { path?: string };
  const path = data?.path ?? '';
  if (!path) throw new Error('업로드 응답에 path가 없습니다.');
  return `${API_BASE_URL}${path}`;
}

/** 게시글 작성 (로그인 필요) */
export async function createPost(body: PostRequest): Promise<PostDetail> {
  const headers = await getAuthHeaders();
  if (!headers['Authorization']) {
    throw new Error('로그인이 필요합니다');
  }
  const url = `${API_BASE_URL}/api/posts`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('로그인이 필요합니다');
    const text = await res.text();
    let msg = `등록 실패 (${res.status})`;
    try {
      const json = text ? JSON.parse(text) : null;
      if (json?.message) msg = json.message;
      else if (typeof json?.error === 'string') msg = json.error;
    } catch {
      if (text && text.length < 200) msg = text;
    }
    throw new Error(msg);
  }
  return res.json();
}

/** 게시글 수정 (로그인 필요) */
export async function updatePost(
  id: number | string,
  body: PostRequest
): Promise<PostDetail> {
  const headers = await getAuthHeaders();
  if (!headers['Authorization']) {
    throw new Error('로그인이 필요합니다');
  }
  const url = `${API_BASE_URL}/api/posts/${id}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('로그인이 필요합니다');
    throw new Error(`updatePost failed: ${res.status}`);
  }
  return res.json();
}

/** 게시글 삭제 (로그인 필요) */
export async function deletePost(id: number | string): Promise<void> {
  const headers = await getAuthHeaders();
  if (!headers['Authorization']) {
    throw new Error('로그인이 필요합니다');
  }
  const url = `${API_BASE_URL}/api/posts/${id}`;
  const res = await fetch(url, { method: 'DELETE', headers });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('로그인이 필요합니다');
    throw new Error(`deletePost failed: ${res.status}`);
  }
}

/** 댓글 한 건의 authorNickname 보정 (snake_case 대응) */
function normalizeCommentAuthorNickname(c: CommentItem | Record<string, unknown>): void {
  const raw = c as Record<string, unknown>;
  if (raw.authorNickname != null && String(raw.authorNickname).trim()) return;
  const fromSnake = raw.author_nickname != null ? String(raw.author_nickname).trim() : '';
  if (fromSnake) (c as CommentItem).authorNickname = fromSnake;
}

/** 댓글 목록 (로그인 시 X-User-Id 전달해 차단 필터·작성자 닉네임 적용) */
export async function getComments(
  postId: number | string,
  params?: { page?: number; size?: number }
): Promise<PageResponse<CommentItem>> {
  const page = params?.page ?? 0;
  const size = params?.size ?? 50;
  const url = `${API_BASE_URL}/api/posts/${postId}/comments?page=${page}&size=${size}`;
  const res = await fetch(url, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error(`getComments failed: ${res.status}`);
  const data = await res.json();
  const content = data?.content ?? [];
  content.forEach((c: CommentItem & { replies?: CommentItem[] }) => {
    normalizeCommentAuthorNickname(c);
    (c.replies ?? []).forEach((r: CommentItem) => normalizeCommentAuthorNickname(r));
  });
  return { ...data, content };
}

/** 댓글 작성 */
export async function createComment(
  postId: number | string,
  body: CommentRequest
): Promise<CommentItem> {
  const url = `${API_BASE_URL}/api/posts/${postId}/comments`;
  const res = await fetch(url, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`createComment failed: ${res.status}`);
  return res.json();
}

/** 댓글 수정 */
export async function updateComment(
  commentId: number | string,
  body: CommentRequest
): Promise<CommentItem> {
  const url = `${API_BASE_URL}/api/comments/${commentId}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`updateComment failed: ${res.status}`);
  return res.json();
}

/** 댓글 삭제 */
export async function deleteComment(commentId: number | string): Promise<void> {
  const url = `${API_BASE_URL}/api/comments/${commentId}`;
  const res = await fetch(url, { method: 'DELETE', headers: await getAuthHeaders() });
  if (!res.ok) throw new Error(`deleteComment failed: ${res.status}`);
}

/** 댓글 좋아요 토글 (로그인 필요). { liked, likeCount } 반환 */
export async function toggleCommentLike(
  commentId: number | string
): Promise<{ liked: boolean; likeCount: number }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/comments/${commentId}/like`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) {
    const msg = res.status === 401 ? '로그인이 만료되었습니다.' : `좋아요 처리 실패 (${res.status})`;
    throw new Error(msg);
  }
  return res.json();
}

/** 게시글 좋아요 토글 (로그인 필요). 기록 저장 후 { liked, likeCount } 반환 */
export async function togglePostLike(
  postId: number | string,
  _userId?: number | null
): Promise<{ liked: boolean; likeCount: number }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/posts/${postId}/like`, {
    method: 'POST',
    headers,
  });
  const text = await res.text();
  if (!res.ok) {
    const msg = res.status === 401 ? '로그인이 만료되었습니다.' : `좋아요 처리 실패 (${res.status})`;
    throw new Error(msg);
  }
  try {
    return JSON.parse(text) as { liked: boolean; likeCount: number };
  } catch {
    throw new Error('서버 응답 형식 오류입니다. 백엔드 주소와 API를 확인해 주세요.');
  }
}
