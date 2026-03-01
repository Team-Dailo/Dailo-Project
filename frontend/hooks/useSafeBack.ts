import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { router } from 'expo-router';

/**
 * GO_BACK이 처리되지 않는 오류 방지: 돌아갈 화면이 없으면 탭 루트로 이동
 * 헤더 뒤로가기 버튼이나 router.back() 대신 사용
 */
export function useSafeBack() {
  const navigation = useNavigation();

  const safeBack = useCallback(() => {
    if (navigation.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/home');
    }
  }, [navigation]);

  return safeBack;
}
