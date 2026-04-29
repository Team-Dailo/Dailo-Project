import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
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

/**
 * FCM Registration Token 획득
 *
 * 서버가 Firebase Admin SDK로 FCM에 직접 발송하므로
 * Expo Push Token이 아닌 FCM Registration Token이 필요합니다.
 *
 * app.json에 googleServicesFile이 설정되어 있으므로:
 * - Android: FCM Registration Token 반환
 * - iOS: FCM Registration Token 반환 (GoogleService-Info.plist 연동)
 *
 * 참고: googleServicesFile이 없으면 iOS는 APNs 토큰을 반환하며,
 * 이 경우 Firebase Admin SDK로 직접 발송할 수 없습니다.
 */
async function getDevicePushToken(): Promise<string | null> {
  try {
    // 알림 권한 확인
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PushToken] 알림 권한이 거부되었습니다.');
      return null;
    }

    // Android 알림 채널 설정
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // FCM Registration Token 획득
    // getDevicePushTokenAsync()는 projectId가 필요 없음
    const tokenData = await Notifications.getDevicePushTokenAsync();
    console.log('[PushToken] FCM 토큰 획득 성공, type:', tokenData.type);

    return tokenData.data;
  } catch (e) {
    // 시뮬레이터/에뮬레이터에서는 푸시 토큰 획득 실패
    console.log('[PushToken] 푸시 토큰 획득 실패 (시뮬레이터이거나 설정 문제):', e);
    return null;
  }
}

/** 서버에 푸시 토큰 등록 - POST /api/notification/token */
export async function registerPushToken(): Promise<boolean> {
  try {
    const pushToken = await getDevicePushToken();
    if (!pushToken) {
      console.log('[PushToken] 푸시 토큰을 획득하지 못했습니다.');
      return false;
    }

    const deviceType = Platform.OS === 'ios' ? 'IOS' : 'ANDROID';

    const res = await fetch(`${API_BASE_URL}/api/notification/token`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        token: pushToken,
        deviceType,
      }),
    });

    if (!res.ok) {
      console.log(`[PushToken] 토큰 등록 실패: ${res.status}`);
      return false;
    }

    console.log('[PushToken] 푸시 토큰 등록 성공');
    return true;
  } catch (e) {
    console.log('[PushToken] 토큰 등록 중 오류:', e);
    return false;
  }
}

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
