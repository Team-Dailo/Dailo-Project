import { API_BASE_URL } from '../constants/api';
import type {
  PostListItem,
  PostDetail,
  PostRequest,
  CommentItem,
  CommentRequest,
  PageResponse,
} from '../types/board';

const getUserId = (): number => {
  const id = process.env.EXPO_PUBLIC_USER_ID;
  if (id != null && id !== '') return Number(id);
  return 1;
};

const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  headers['X-User-Id'] = String(getUserId());
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

/** 게시글 상세 */
export async function getPostById(id: number | string): Promise<PostDetail> {
  const url = `${API_BASE_URL}/api/posts/${id}`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) throw new Error(`getPostById failed: ${res.status}`);
  return res.json();
}

/** 게시글 작성 */
export async function createPost(body: PostRequest): Promise<PostDetail> {
  const url = `${API_BASE_URL}/api/posts`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`createPost failed: ${res.status}`);
  return res.json();
}

/** 게시글 수정 */
export async function updatePost(
  id: number | string,
  body: PostRequest
): Promise<PostDetail> {
  const url = `${API_BASE_URL}/api/posts/${id}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`updatePost failed: ${res.status}`);
  return res.json();
}

/** 게시글 삭제 */
export async function deletePost(id: number | string): Promise<void> {
  const url = `${API_BASE_URL}/api/posts/${id}`;
  const res = await fetch(url, { method: 'DELETE', headers: getHeaders() });
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
    headers: getHeaders(),
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
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`updateComment failed: ${res.status}`);
  return res.json();
}

/** 댓글 삭제 */
export async function deleteComment(commentId: number | string): Promise<void> {
  const url = `${API_BASE_URL}/api/comments/${commentId}`;
  const res = await fetch(url, { method: 'DELETE', headers: getHeaders() });
  if (!res.ok) throw new Error(`deleteComment failed: ${res.status}`);
}
