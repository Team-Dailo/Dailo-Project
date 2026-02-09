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
      } else {
        data = await boardService.getPostListByCategory(selectedCategory, {
          page: 0,
          size: 50,
        });
        if (sortType === 'popular') {
          data = {
            ...data,
            content: [...data.content].sort((a, b) => (b.likeCount ?? 0) - (a.likeCount ?? 0)),
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
