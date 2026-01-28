// frontend/constants/mockEvents.ts
import type { Event } from '../types/event';

export const MOCK_EVENTS: Event[] = [
  {
    id: '1',
    title: '동아리 정기공연',
    category: 'PERFORMANCE',
    scale: 'UNIVERSITY',
    startAt: '2026-01-25T19:00:00+09:00',
    endAt: '2026-01-25T21:00:00+09:00',
    latitude: 37.551,
    longitude: 126.942,
    address: '한국교통대 W3동',
    placeName: 'W3동 대강당',
    isBookmarked: false,
  },
];
