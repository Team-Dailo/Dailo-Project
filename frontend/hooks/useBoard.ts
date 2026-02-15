import { useState, useEffect, useCallback } from 'react';
import type { PostListItem, PostDetail, CommentItem, PageResponse } from '../types/board';
import * as boardService from '../services/board.service';

type Category = '전체' | '후기' | '질문' | '자유';
type SortType = 'latest' | 'popular';

/** 게시글 목록 (카테고리 + 정렬) */
export function usePostList(selectedCategory: Category, sortType: SortType) {
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data: PageResponse<PostListItem>;
      if (selectedCategory === '전체') {
        data = await boardService.getPostList({
          page: 0,
          size: 50,
          sort: sortType === 'popular' ? 'likeCount' : 'createdAt',
          direction: 'DESC',
        });
        if (sortType === 'popular' && data.content?.length) {
          data = {
            ...data,
            content: [...data.content].sort((a, b) => {
              const la = a.likeCount ?? 0;
              const lb = b.likeCount ?? 0;
              if (lb !== la) return lb - la;
              const ca = a.commentCount ?? 0;
              const cb = b.commentCount ?? 0;
              if (cb !== ca) return cb - ca;
              return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
            }),
          };
        }
      } else {
        data = await boardService.getPostListByCategory(selectedCategory, {
          page: 0,
          size: 50,
        });
        if (sortType === 'popular') {
          data = {
            ...data,
            content: [...data.content].sort((a, b) => {
              const la = a.likeCount ?? 0;
              const lb = b.likeCount ?? 0;
              if (lb !== la) return lb - la;
              const ca = a.commentCount ?? 0;
              const cb = b.commentCount ?? 0;
              if (cb !== ca) return cb - ca;
              return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
            }),
          };
        }
      }
      setPosts(data.content ?? []);
      setTotalElements(data.totalElements ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, sortType]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return { posts, totalElements, loading, error, refetch: fetchList };
}

/** 게시글 상세 */
export function usePostDetail(id: string | undefined) {
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) {
      setPost(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await boardService.getPostById(id);
      setPost(data);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { post, loading, error, refetch: fetchDetail };
}

/** 내가 쓴 글 목록 (게시판 기록) - userId가 있을 때만 조회 */
export function useMyPostList(userId: number | null | undefined) {
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(!!userId);
  const [error, setError] = useState<Error | null>(null);

  const fetchList = useCallback(async () => {
    if (userId == null || userId <= 0) {
      setPosts([]);
      setTotalElements(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await boardService.getMyPosts(userId, { page: 0, size: 50 });
      setPosts(data.content ?? []);
      setTotalElements(data.totalElements ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return { posts, totalElements, loading, error, refetch: fetchList };
}

/** 홈 인기 게시물: 카테고리별 좋아요 최다 1개씩 (후기, 질문, 자유) */
const HOME_CATEGORIES = ['후기', '질문', '자유'] as const;

export function useHomePopularPosts() {
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await boardService.getPostList({
        page: 0,
        size: 80,
        sort: 'likeCount',
        direction: 'DESC',
      });
      const content = data.content ?? [];
      // 좋아요 많은 순, 같으면 댓글 많은 순
      content.sort((a, b) => {
        const la = a.likeCount ?? 0;
        const lb = b.likeCount ?? 0;
        if (lb !== la) return lb - la;
        const ca = a.commentCount ?? 0;
        const cb = b.commentCount ?? 0;
        if (cb !== ca) return cb - ca;
        return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
      });
      const byCategory: Record<string, PostListItem> = {};
      for (const post of content) {
        const cat = post.categoryType ?? '';
        if (HOME_CATEGORIES.includes(cat as typeof HOME_CATEGORIES[number]) && !byCategory[cat]) {
          byCategory[cat] = post;
        }
      }
      const ordered = HOME_CATEGORIES.map((c) => byCategory[c]).filter(Boolean);
      setPosts(ordered);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return { posts, loading, error, refetch: fetchList };
}

/** 게시글 검색 (GET /api/posts/search) */
export function useSearchPosts(keyword: string | undefined) {
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(!!keyword);
  const [error, setError] = useState<Error | null>(null);

  const fetchList = useCallback(async () => {
    const k = keyword?.trim();
    if (!k) {
      setPosts([]);
      setTotalElements(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await boardService.searchPosts(k, { page: 0, size: 50 });
      setPosts(data.content ?? []);
      setTotalElements(data.totalElements ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return { posts, totalElements, loading, error, refetch: fetchList };
}

/** 댓글 목록 */
export function useComments(postId: string | undefined) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchComments = useCallback(async () => {
    if (!postId) {
      setComments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await boardService.getComments(postId, { page: 0, size: 100 });
      setComments(data.content ?? []);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return { comments, loading, error, refetch: fetchComments };
}
