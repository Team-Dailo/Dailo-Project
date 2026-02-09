// frontend/types/event.ts
export type EventCategory =
  | 'PERFORMANCE'
  | 'FOOD_TRUCK'
  | 'EXPERIENCE'
  | 'EXHIBITION';

export type EventScale =
  | 'CITY'
  | 'UNIVERSITY'
  | 'DEPARTMENT'
  | 'CLUB'
  | 'PERSONAL';

export interface Event {
  id: string;
  title: string;
  category: EventCategory;
  scale: EventScale;
  startAt: string; // ISO string
  endAt: string;   // ISO string
  latitude: number;
  longitude: number;
  address: string;
  placeName: string;
  thumbnailUrl?: string;
  isBookmarked?: boolean;
}

/** 이벤트 상세 (GET /api/events/{id} 응답) */
export interface EventDetail {
  id: number;
  title: string;
  posterUrls: string[];
  startAt: string;
  endAt: string;
  placeName: string | null;
  placeAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  categories: string[];
  hostContact: string | null;
  status: string;
  naverMapUrl: string | null;
}
