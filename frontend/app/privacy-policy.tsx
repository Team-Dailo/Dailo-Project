// app/privacy-policy.tsx - 루트 경로 개인정보처리방침 (회원가입 등에서 (보기) 클릭 시 사용, 뒤로가기 → 이전 화면)
import React from 'react';
import { View, Pressable } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrivacyPolicyContent } from '../components/PrivacyPolicyContent';

export default function RootPrivacyPolicyScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: '개인정보처리방침',
          headerShown: true,
          headerTitleAlign: 'center',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={{ paddingHorizontal: 4 }}>
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
