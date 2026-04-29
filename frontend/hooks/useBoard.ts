import { useState, useEffect, useCallback } from 'react';
import type { PostListItem, PostDetail, CommentItem, PageResponse } from '../types/board';
import * as boardService from '../services/board.service';

type Category = '전체' | '후기' | '질문' | '자유';
type SortType = 'latest' | 'popular';

/** 인기글 필터: 좋아요 5개 이상 + 최근 7일 */
function filterPopularPosts(content: PostListItem[]): PostListItem[] {
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return content.filter((post) => {
    const likes = post.likeCount ?? 0;
    if (likes < MIN_LIKES_FOR_POPULAR) return false;

    try {
      const createdAt = (post as Record<string, unknown>).createdAt ?? (post as Record<string, unknown>).created_at;
      if (!createdAt) return false;
      const postDate = new Date(createdAt as string);
      return postDate >= cutoffDate;
    } catch {
      return false;
    }
  });
}

/** 인기글 정렬: 좋아요 > 댓글 > 최신 */
function sortPopularPosts(content: PostListItem[]): PostListItem[] {
  return [...content].sort((a, b) => {
    const la = a.likeCount ?? 0;
    const lb = b.likeCount ?? 0;
    if (lb !== la) return lb - la;
    const ca = a.commentCount ?? 0;
    const cb = b.commentCount ?? 0;
    if (cb !== ca) return cb - ca;
    return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
  });
}

/** 게시글 목록 (카테고리 + 정렬). 후기일 때 reviewEventId 있으면 해당 행사 후기만 */
export function usePostList(
  selectedCategory: Category,
  sortType: SortType,
  reviewEventId?: number | null
) {
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
          size: 100,
          sort: sortType === 'popular' ? 'likeCount' : 'createdAt',
          direction: 'DESC',
        });
        if (sortType === 'popular' && data.content?.length) {
          const filtered = filterPopularPosts(data.content);
          data = {
            ...data,
            content: sortPopularPosts(filtered),
            totalElements: filtered.length,
          };
        }
      } else if (selectedCategory === '후기' && reviewEventId != null && reviewEventId > 0) {
        data = await boardService.getPostsByEventId(reviewEventId, { page: 0, size: 100 });
        if (sortType === 'popular') {
          const filtered = filterPopularPosts(data.content);
          data = {
            ...data,
            content: sortPopularPosts(filtered),
            totalElements: filtered.length,
          };
        }
      } else {
        data = await boardService.getPostListByCategory(selectedCategory, {
          page: 0,
          size: 100,
        });
        if (sortType === 'popular') {
          const filtered = filterPopularPosts(data.content);
          data = {
            ...data,
            content: sortPopularPosts(filtered),
            totalElements: filtered.length,
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
  }, [selectedCategory, sortType, reviewEventId]);

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

/** 내가 쓴 글 목록 (게시판 기록) - 로그인 시 JWT로 조회 (userId 불필요) */
export function useMyPostList(enabled: boolean) {
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const fetchList = useCallback(async () => {
    if (!enabled) {
      setPosts([]);
      setTotalElements(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await boardService.getMyPosts(undefined, { page: 0, size: 50 });
      setPosts(data.content ?? []);
      setTotalElements(data.totalElements ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return { posts, totalElements, loading, error, refetch: fetchList };
}

/** 댓글 단 글 목록 (마이페이지) - 로그인 시에만 조회 */
export function useMyCommentedPostList(enabled: boolean) {
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const fetchList = useCallback(async () => {
    if (!enabled) {
      setPosts([]);
      setTotalElements(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await boardService.getMyCommentedPosts({ page: 0, size: 50 });
      setPosts(data.content ?? []);
      setTotalElements(data.totalElements ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return { posts, totalElements, loading, error, refetch: fetchList };
}

/** 좋아요 누른 글 목록 (마이페이지) - 로그인 시에만 조회 */
export function useLikedPostList(enabled: boolean = true) {
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const fetchList = useCallback(async () => {
    if (!enabled) {
      setPosts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await boardService.getLikedPosts({ page: 0, size: 50 });
      setPosts(data.content ?? []);
      setTotalElements(data.totalElements ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return { posts, totalElements, loading, error, refetch: fetchList };
}

/** 홈 인기 게시물: 좋아요 5개 이상 + 최근 7일 내 게시물, 카테고리별 1개씩 (후기, 질문, 자유) */
const HOME_CATEGORIES = ['후기', '질문', '자유'] as const;
const MIN_LIKES_FOR_POPULAR = 5;
const POPULAR_DAYS_LIMIT = 7;

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
        size: 100,
        sort: 'likeCount',
        direction: 'DESC',
      });
      const content = data.content ?? [];

      // 최근 7일 기준 날짜 계산
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - POPULAR_DAYS_LIMIT * 24 * 60 * 60 * 1000);

      // 좋아요 10개 이상 + 최근 7일 내 게시물만 필터
      const filtered = content.filter((post) => {
        const likes = post.likeCount ?? 0;
        if (likes < MIN_LIKES_FOR_POPULAR) return false;

        try {
          const createdAt = (post as Record<string, unknown>).createdAt ?? (post as Record<string, unknown>).created_at;
          if (!createdAt) return false;
          const postDate = new Date(createdAt as string);
          return postDate >= cutoffDate;
        } catch {
          return false;
        }
      });

      // 좋아요 많은 순, 같으면 댓글 많은 순, 같으면 최신순
      filtered.sort((a, b) => {
        const la = a.likeCount ?? 0;
        const lb = b.likeCount ?? 0;
        if (lb !== la) return lb - la;
        const ca = a.commentCount ?? 0;
        const cb = b.commentCount ?? 0;
        if (cb !== ca) return cb - ca;
        return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
      });

      // 카테고리별 1개씩 선정
      const byCategory: Record<string, PostListItem> = {};
      for (const post of filtered) {
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

  /** 삭제된 댓글을 목록에서 즉시 제거 (삭제 API 성공 후 호출) */
  const removeComment = useCallback((commentId: number | string) => {
    const idStr = String(commentId);
    setComments((prev) =>
      prev
        .filter((c) => String(c.id) !== idStr)
        .map((c) => ({
          ...c,
          replies: (c.replies ?? []).filter((r) => String(r.id) !== idStr),
        }))
    );
  }, []);

  /** 댓글/대댓글 좋아요 상태와 카운트를 로컬에서 즉시 업데이트 */
  const updateCommentLike = useCallback((commentId: number | string, liked: boolean, likeCount: number) => {
    const idStr = String(commentId);
    setComments((prev) =>
      prev.map((c) => {
        if (String(c.id) === idStr) return { ...c, isLiked: liked, likeCount };
        return {
          ...c,
          replies: (c.replies ?? []).map((r) =>
            String(r.id) === idStr ? { ...r, isLiked: liked, likeCount } : r
          ),
        };
      })
    );
  }, []);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return { comments, loading, error, refetch: fetchComments, removeComment, updateCommentLike };
}
