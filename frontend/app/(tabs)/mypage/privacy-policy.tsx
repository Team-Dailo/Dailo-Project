// app/(tabs)/mypage/privacy-policy.tsx - 개인정보처리방침 (설정 등에서 진입, safeBack 사용)
import React from 'react';
import { Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeBack } from '../../../hooks/useSafeBack';
import { PrivacyPolicyContent } from '../../../components/PrivacyPolicyContent';

export default function PrivacyPolicyScreen() {
  const safeBack = useSafeBack();

  return (
    <>
      <Stack.Screen
        options={{
          title: '개인정보처리방침',
          headerShown: true,
          headerTitleAlign: 'center',
          headerLeft: () => (
            <Pressable onPress={safeBack} hitSlop={8} style={{ paddingHorizontal: 4 }}>
              <Ionicons name="chevron-back" size={22} color="#111827" />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['left', 'right', 'bottom']}>
        <PrivacyPolicyContent />
      </SafeAreaView>
    </>
  );
}
