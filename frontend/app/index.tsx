// app/index.tsx - 루트 경로(/) 접근 시 홈 탭으로 리다이렉트
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/(tabs)/home" />;
}
