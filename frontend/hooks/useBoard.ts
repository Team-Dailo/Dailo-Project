import { useState, useEffect, useCallback } from "react";
import * as boardService from "../services/board.service";

type Category = "전체" | "후기" | "질문" | "자유";
type SortType = "latest" | "popular";

export function usePostList(selectedCategory: Category, sortType: SortType) {
  const [posts, setPosts] = useState<any[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await boardService.getPosts({
        categoryType: selectedCategory === "전체" ? undefined : selectedCategory,
        sort: sortType,
        page: 0,
        size: 20,
      });

      setPosts(res.content ?? []);
      setTotalElements(res.totalElements ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setPosts([]);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, sortType]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return { posts, totalElements, loading, error, refetch: fetchList };
}

export function usePostDetail(id: string | undefined) {
  const [post, setPost] = useState<any | null>(null);
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
      const res = await boardService.getPostById(id);
      setPost(res);
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

export function useComments(postId: string | undefined) {
  const [comments, setComments] = useState<any[]>([]);
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
      const res = await boardService.getComments(postId);
      setComments(res.content ?? res ?? []);
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

export function useSearchPosts(keyword?: string) {
  const [posts, setPosts] = useState<any[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSearch = useCallback(async () => {
    if (!keyword?.trim()) {
      setPosts([]);
      setTotalElements(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await boardService.searchPosts(keyword, 0, 20);
      setPosts(res.content ?? []);
      setTotalElements(res.totalElements ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setPosts([]);
      setTotalElements(0);
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  useEffect(() => {
    fetchSearch();
  }, [fetchSearch]);

  return { posts, totalElements, loading, error, refetch: fetchSearch };
}

type HomePopularPost = {
  id: number;
  title?: string;
  contentPreview?: string;
  categoryType?: string;
  createdAt?: string;
};

export function useHomePopularPosts() {
  const [posts, setPosts] = useState<HomePopularPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPopularPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await boardService.getPosts({
        sort: "popular",
        page: 0,
        size: 3,
      });

      setPosts(res.content ?? []);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPopularPosts();
  }, [fetchPopularPosts]);

  return { posts, loading, error, refetch: fetchPopularPosts };
}
