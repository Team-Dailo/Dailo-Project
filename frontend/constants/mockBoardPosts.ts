// constants/mockBoardPosts.ts
import type { BoardPost, BoardComment } from "../types/board";

export const mockBoardNotice = {
  title: "공지사항",
  preview: "[공지사항] 이번 주 서버 점검 안내드립니다...",
};

export const mockBoardPosts: BoardPost[] = [
  {
    id: "1",
    authorName: "dog_dog",
    authorAvatarUrl:
      "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200&h=200&fit=crop",
    category: "후기",
    content:
      "이번 축제 푸드존 진짜 대박이었어요...😭\n특히 감자버터구이랑 타코야끼 라인은 줄이 길었는데 기다릴 가치 있었음!\n분위기도 너무 좋고 친구들이랑 사진도 많이 찍어서 행복했어요.",
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    likeCount: 45,
    commentCount: 12,
  },
  {
    id: "2",
    authorName: "cat",
    authorAvatarUrl:
      "https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=200&h=200&fit=crop",
    category: "자유",
    content:
      "저녁 공연 무대 연출 미쳤어요.\n조명 + 사운드 + 날씨 삼박자가 완벽해서\n가수 나온 순간 다 같이 떼창한 거 아직도 소름…🔥\n영원히 기억에 남을 하루였습니다!",
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    likeCount: 33,
    commentCount: 50,
  },
  {
    id: "3",
    authorName: "penguin",
    category: "질문",
    content: "푸드존 결제는 카드만 되나요? 현금도 되는지 궁금해요!",
    createdAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    likeCount: 5,
    commentCount: 3,
  },
];

export const mockBoardComments: BoardComment[] = [
  {
    id: "c1",
    postId: "1",
    authorName: "dog_1",
    content: "저도 거기 가봤는데 정말 좋았어요!",
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    id: "c2",
    postId: "1",
    authorName: "dog_2",
    content: "다음에 같이 가요",
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
];
