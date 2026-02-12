import { API_BASE_URL } from '../constants/api';
import { getAccessToken, getStoredUserId } from './auth.service';
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

/** 인증 헤더 (작성/수정/삭제용) - JWT 토큰 포함 */
const getAuthHeaders = async (): Promise<HeadersInit> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = await getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // userId도 전달 (백엔드에서 필요할 수 있음)
  const userId = await getStoredUserId();
  if (userId != null) {
    headers['X-User-Id'] = String(userId);
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
  const res = await fetch(url, { headers: getHeaders() });
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
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) throw new Error(`getPostListByCategory failed: ${res.status}`);
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
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) throw new Error(`searchPosts failed: ${res.status}`);
  return res.json();
}

/** 내가 쓴 글 목록 (마이페이지 게시판 기록) - 인증 필요 */
export async function getMyPosts(
  userId: number,
  params?: { page?: number; size?: number }
): Promise<PageResponse<PostListItem>> {
  const page = params?.page ?? 0;
  const size = params?.size ?? 20;
  const url = `${API_BASE_URL}/api/posts/my?page=${page}&size=${size}`;
  const res = await fetch(url, { headers: await getAuthHeaders() });
  if (!res.ok) throw new Error(`getMyPosts failed: ${res.status}`);
  return res.json();
}

/** 게시글 상세 */
export async function getPostById(id: number | string): Promise<PostDetail> {
  const url = `${API_BASE_URL}/api/posts/${id}`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) throw new Error(`getPostById failed: ${res.status}`);
  return res.json();
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
    throw new Error(`createPost failed: ${res.status}`);
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

/** 댓글 목록 */
export async function getComments(
  postId: number | string,
  params?: { page?: number; size?: number }
): Promise<PageResponse<CommentItem>> {
  const page = params?.page ?? 0;
  const size = params?.size ?? 50;
  const url = `${API_BASE_URL}/api/posts/${postId}/comments?page=${page}&size=${size}`;
  const res = await fetch(url, { headers: getHeaders() });
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

/** 게시글 좋아요 토글 (로그인 필요). 기록 저장 후 { liked, likeCount } 반환 */
export async function togglePostLike(
  postId: number | string,
  userId?: number | null
): Promise<{ liked: boolean; likeCount: number }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/api/posts/${postId}/like`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) throw new Error(`togglePostLike failed: ${res.status}`);
  return res.json();
}
