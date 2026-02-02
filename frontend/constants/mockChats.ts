// constants/mockChats.ts
export type ChatItem = {
  id: string;
  name: string;
  avatarUrl?: string;
  lastMessage: string;
  updatedAt: string; // ISO
};

export const mockChats: ChatItem[] = [
  {
    id: "1",
    name: "일이삼님",
    avatarUrl:
      "https://images.unsplash.com/photo-1524503033411-f63f1cfc5f1d?w=200&h=200&fit=crop",
    lastMessage: "안녕하세요! 반가워요",
    updatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: "2",
    name: "사오육님",
    avatarUrl:
      "https://images.unsplash.com/photo-1520975958225-6d80f3b36a2e?w=200&h=200&fit=crop",
    lastMessage: "뭐하세요",
    updatedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: "3",
    name: "강아지님",
    avatarUrl:
      "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200&h=200&fit=crop",
    lastMessage: "재밌어요",
    updatedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    id: "4",
    name: "고양이님",
    avatarUrl:
      "https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=200&h=200&fit=crop",
    lastMessage: "즐거워요",
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
];
