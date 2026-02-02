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
