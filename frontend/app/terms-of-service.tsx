// app/terms-of-service.tsx - 이용약관 페이지
import React from 'react';
import { Pressable } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TermsOfServiceContent } from '../components/TermsOfServiceContent';

export default function TermsOfServiceScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: '이용약관',
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
        <TermsOfServiceContent />
      </SafeAreaView>
    </>
  );
}
