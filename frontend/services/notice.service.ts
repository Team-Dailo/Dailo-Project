/**
 * 공지사항 API (GET /api/notices - 비로그인 포함 공개)
 * 게시판 공지사항 탭 목록/상세용
 */
import { API_BASE_URL } from '../constants/api';

export type NoticeItem = {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

/** 공지 목록 */
export async function getNotices(params?: { page?: number; size?: number }): Promise<{
  content: NoticeItem[];
  totalPages: number;
  totalElements: number;
}> {
  const page = params?.page ?? 0;
  const size = params?.size ?? 100;
  const res = await fetch(
    `${API_BASE_URL}/api/notices?page=${page}&size=${size}&sort=createdAt,desc`
  );
  if (!res.ok) throw new Error('공지 목록을 불러올 수 없습니다.');
  const data = await res.json();
  return {
    content: (data.content ?? []).map(
      (n: { id: number; title: string; content: string; createdAt: string; updatedAt: string }) => ({
        id: n.id,
        title: n.title ?? '',
        content: n.content ?? '',
        createdAt: n.createdAt ?? '',
        updatedAt: n.updatedAt ?? '',
      })
    ),
    totalPages: data.totalPages ?? 0,
    totalElements: data.totalElements ?? 0,
  };
}

/** 공지 단건 */
export async function getNoticeById(id: number): Promise<NoticeItem | null> {
  const res = await fetch(`${API_BASE_URL}/api/notices/${id}`);
  if (!res.ok) return null;
  const n = await res.json();
  return {
    id: n.id,
    title: n.title ?? '',
    content: n.content ?? '',
    createdAt: n.createdAt ?? '',
    updatedAt: n.updatedAt ?? '',
  };
}
