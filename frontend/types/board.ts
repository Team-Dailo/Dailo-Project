// types/board.ts
export type BoardCategory = "전체" | "후기" | "질문" | "자유";

export type BoardSort = "최신글" | "인기글";

export type BoardPost = {
  id: string;
  authorName: string;
  authorAvatarUrl?: string;
  category: Exclude<BoardCategory, "전체">; // 게시글은 실제 카테고리만
  content: string;
  createdAt: string; // ISO string
  likeCount: number;
  commentCount: number;
};

export type BoardComment = {
  id: string;
  postId: string;
  authorName: string;
  authorAvatarUrl?: string;
  content: string;
  createdAt: string; // ISO string
};
