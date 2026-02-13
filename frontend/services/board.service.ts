import { API_BASE_URL } from '../constants/api';
import * as authService from './auth.service';
import type {
  PostListItem,
  PostDetail,
  PostRequest,
  CommentItem,
  CommentRequest,
  PageResponse,
} from '../types/board';

/** 로그인한 사용자 id만 사용. 비로그인 시 X-User-Id 미전송 → 백엔드가 비로그인으로 조회 허용 */
const getHeaders = async (overrideUserId?: number): Promise<HeadersInit> => {
  const id = overrideUserId ?? (await authService.getStoredUserId()) ?? null;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (id != null) {
    (headers as Record<string, string>)['X-User-Id'] = String(id);
  }
  const token = await authService.getAccessToken();
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

/** 게시글 목록 (전체, 정렬: 최신/인기) */
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
  const res = await fetch(url, { headers: await getHeaders() });
  if (!res.ok) throw new Error(`getPostList failed: ${res.status}`);
  return res.json();
}

/** 카테고리별 게시글 목록 */
export async function getPostListByCategory(
  categoryType: string,
  params?: { page?: number; size?: number }
): Promise<PageResponse<PostListItem>> {
  const page = params?.page ?? 0;
  const size = params?.size ?? 20;
  const url = `${API_BASE_URL}/api/posts/category/${encodeURIComponent(categoryType)}?page=${page}&size=${size}`;
  const res = await fetch(url, { headers: await getHeaders() });
  if (!res.ok) throw new Error(`getPostListByCategory failed: ${res.status}`);
  return res.json();
}

/** 행사별 후기 목록 (해당 행사에 연결된 게시글) */
export async function getPostsByEventId(
  eventId: number,
  params?: { page?: number; size?: number }
): Promise<PageResponse<PostListItem>> {
  const page = params?.page ?? 0;
  const size = params?.size ?? 20;
  const url = `${API_BASE_URL}/api/posts/event/${eventId}?page=${page}&size=${size}`;
  const res = await fetch(url, { headers: await getHeaders() });
  if (!res.ok) throw new Error(`getPostsByEventId failed: ${res.status}`);
  return res.json();
}

/** 게시글 검색 */
export async function searchPosts(
  keyword: string,
  params?: { page?: number; size?: number }
): Promise<PageResponse<PostListItem>> {
  const page = params?.page ?? 0;
  const size = params?.size ?? 20;
  const url = `${API_BASE_URL}/api/posts/search?keyword=${encodeURIComponent(keyword)}&page=${page}&size=${size}`;
  const res = await fetch(url, { headers: await getHeaders() });
  if (!res.ok) throw new Error(`searchPosts failed: ${res.status}`);
  return res.json();
}

/** 내가 쓴 글 목록 (마이페이지 게시판 기록) - userId 필수 */
export async function getMyPosts(
  userId: number,
  params?: { page?: number; size?: number }
): Promise<PageResponse<PostListItem>> {
  const page = params?.page ?? 0;
  const size = params?.size ?? 20;
  const url = `${API_BASE_URL}/api/posts/my?page=${page}&size=${size}`;
  const res = await fetch(url, { headers: await getHeaders(userId) });
  if (!res.ok) throw new Error(`getMyPosts failed: ${res.status}`);
  return res.json();
}

/** 게시글 상세 */
export async function getPostById(id: number | string): Promise<PostDetail> {
  const url = `${API_BASE_URL}/api/posts/${id}`;
  const res = await fetch(url, { headers: await getHeaders() });
  if (!res.ok) throw new Error(`getPostById failed: ${res.status}`);
  return res.json();
}

/** 게시글 작성 (userId 넣으면 해당 사용자로 등록 - 계정 전환 시 올바른 작성자) */
export async function createPost(body: PostRequest, userId?: number | null): Promise<PostDetail> {
  const url = `${API_BASE_URL}/api/posts`;
  const headers = await getHeaders(userId ?? undefined);
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`createPost failed: ${res.status}`);
  return res.json();
}

/** 게시글 수정 (userId 넣으면 해당 사용자로 수정 요청) */
export async function updatePost(
  id: number | string,
  body: PostRequest,
  userId?: number | null
): Promise<PostDetail> {
  const url = `${API_BASE_URL}/api/posts/${id}`;
  const headers = await getHeaders(userId ?? undefined);
  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`updatePost failed: ${res.status}`);
  return res.json();
}

/** 게시글 삭제 (userId 넣으면 해당 사용자로 삭제 요청 - 작성자 일치용) */
export async function deletePost(id: number | string, userId?: number | null): Promise<void> {
  const url = `${API_BASE_URL}/api/posts/${id}`;
  const headers = await getHeaders(userId ?? undefined);
  const res = await fetch(url, { method: 'DELETE', headers });
  if (!res.ok) throw new Error(`deletePost failed: ${res.status}`);
}

/** 댓글 목록 */
export async function getComments(
  postId: number | string,
  params?: { page?: number; size?: number }
): Promise<PageResponse<CommentItem>> {
  const page = params?.page ?? 0;
  const size = params?.size ?? 50;
  const url = `${API_BASE_URL}/api/posts/${postId}/comments?page=${page}&size=${size}`;
  const res = await fetch(url, { headers: await getHeaders() });
  if (!res.ok) throw new Error(`getComments failed: ${res.status}`);
  return res.json();
}

/** 댓글 작성 */
export async function createComment(
  postId: number | string,
  body: CommentRequest
): Promise<CommentItem> {
  const url = `${API_BASE_URL}/api/posts/${postId}/comments`;
  const res = await fetch(url, {
    method: 'POST',
    headers: await getHeaders(),
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
    headers: await getHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`updateComment failed: ${res.status}`);
  return res.json();
}

/** 댓글 삭제 */
export async function deleteComment(commentId: number | string): Promise<void> {
  const url = `${API_BASE_URL}/api/comments/${commentId}`;
  const res = await fetch(url, { method: 'DELETE', headers: await getHeaders() });
  if (!res.ok) throw new Error(`deleteComment failed: ${res.status}`);
}

/** 게시글 좋아요 토글 (로그인 필요). 기록 저장 후 { liked, likeCount } 반환 */
export async function togglePostLike(
  postId: number | string,
  userId?: number | null
): Promise<{ liked: boolean; likeCount: number }> {
  const headers = await getHeaders(userId ?? undefined);
  const res = await fetch(`${API_BASE_URL}/api/posts/${postId}/like`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) throw new Error(`togglePostLike failed: ${res.status}`);
  return res.json();
}
