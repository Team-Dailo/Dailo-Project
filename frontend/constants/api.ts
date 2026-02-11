// constants/api.ts
// ✅ Expo 환경변수(EXPO_PUBLIC_*)는 JS 번들 시점에 주입됨
// ✅ 실기기: http://192.168.219.102:8080
// ✅ 에뮬레이터(Android): http://10.0.2.2:8080

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim() ||
  "http://10.0.2.2:8080"; // env가 안 잡힐 때 기본값(에뮬레이터용)
