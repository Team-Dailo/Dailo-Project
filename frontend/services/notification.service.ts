import { API_BASE_URL } from '../constants/api';
import { getAccessToken } from './auth.service';

/** 인증 헤더 */
const getAuthHeaders = async (): Promise<HeadersInit> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = await getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export type NotificationSettings = {
  memberId: number;
  newEventEnabled: boolean;
  eventReminderEnabled: boolean;
  subscribedCategories: string | null;
  subscribedRegions: string | null;
};

/** 알림 설정 조회 - GET /api/notification/settings */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  const res = await fetch(`${API_BASE_URL}/api/notification/settings`, {
    headers: await getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`get notification settings failed: ${res.status}`);
  return res.json();
}

/** 알림 설정 업데이트 - PUT /api/notification/settings */
export async function updateNotificationSettings(settings: {
  newEventEnabled?: boolean;
  eventReminderEnabled?: boolean;
  subscribedCategories?: string | null;
  subscribedRegions?: string | null;
}): Promise<NotificationSettings> {
  const res = await fetch(`${API_BASE_URL}/api/notification/settings`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      newEventEnabled: settings.newEventEnabled ?? true,
      eventReminderEnabled: settings.eventReminderEnabled ?? true,
      subscribedCategories: settings.subscribedCategories ?? null,
      subscribedRegions: settings.subscribedRegions ?? null,
    }),
  });
  if (!res.ok) throw new Error(`update notification settings failed: ${res.status}`);
  return res.json();
}
