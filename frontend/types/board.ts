/**
 * 게시판 타입 (백엔드 DTO와 매핑)
 */

/** 목록용 게시글 (PostListResponseDto) */
export type PostListItem = {
  id: number;
  authorId: number;
  authorNickname?: string;
  title: string;
  /** 목록 미리보기용 본문 일부 */
  contentPreview?: string;
  categoryType: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  createdAt: string;
};

/** 상세용 게시글 (PostResponseDto) */
export type PostDetail = PostListItem & {
  content: string;
  status: string;
  updatedAt: string;
};

/** 게시글 작성/수정 요청 (PostRequestDto) */
export type PostRequest = {
  title: string;
  content: string;
  categoryType: string;
};

/** 댓글 (CommentResponseDto) */
export type CommentItem = {
  id: number;
  postId: number;
  parentCommentId: number | null;
  authorId: number;
  content: string;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  replies: CommentItem[];
};

/** 댓글 작성 요청 (CommentRequestDto) */
export type CommentRequest = {
  content: string;
  parentCommentId?: number | null;
};

/** Spring Page 응답 */
export type PageResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
};
