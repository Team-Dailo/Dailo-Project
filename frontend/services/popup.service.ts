import { API_BASE_URL } from '../constants/api';

export type PopupItem = {
  id: number;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
};

export async function getActivePopups(): Promise<PopupItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/popups`);
  if (!res.ok) return [];
  return res.json();
}
