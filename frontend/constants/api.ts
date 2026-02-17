/**
 * API 베이스 URL (환경변수 또는 기본값)
 * 실제 배포 시 .env 등에서 EXPO_PUBLIC_API_URL 로 설정
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'https://localhost:8080';
