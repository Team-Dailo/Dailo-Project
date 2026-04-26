import { API_BASE_URL } from '../constants/api';
import { getAccessToken } from './auth.service';

export type SurveyRequest = {
  eventId: number;
  eventTitle?: string;
  name: string;
  phone: string;
  feedback?: string;
};

export type SurveyResponse = {
  id: number;
  eventId: number;
  eventTitle: string | null;
  name: string;
  phone: string;
  feedback: string | null;
  createdAt: string;
};

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  if (!token) throw new Error('로그인이 필요합니다.');
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...((options.headers as Record<string, string>) ?? {}),
    },
  });
}

export async function submitSurvey(body: SurveyRequest): Promise<SurveyResponse> {
  const res = await authFetch('/api/surveys', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || '설문 제출 실패');
  }
  return res.json();
}

export async function checkSurveySubmitted(eventId: number): Promise<boolean> {
  try {
    const res = await authFetch(`/api/surveys/check?eventId=${eventId}`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.submitted === true;
  } catch {
    return false;
  }
}
