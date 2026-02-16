// app/(tabs)/mypage/admin-guide.tsx - 관리자: 이용 안내 수정
// 흐름: 관리자 메뉴 > 이용안내 수정 진입 → getUsageGuide() 로 현재 문구 로드 → 수정 후 updateUsageGuide() (PUT /api/admin/content/usage-guide) 저장. guide.tsx에서 동일 API로 조회해 표시.
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as contentService from '../../../services/content.service';

const PLACEHOLDER = `## Dailo 이용 안내

이용 안내는 지도 탭 사이드메뉴(☰) > 이용 안내, 또는 마이페이지에서 볼 수 있습니다. 관리자는 마이페이지 > 관리자 메뉴 > 이용안내 수정에서 이 문구를 수정할 수 있습니다.

### 지도
- 지도에서 축제·행사 마커를 탭하면 행사 정보를 볼 수 있습니다.
- 현재 위치에서 행사 마커까지 **500m 이내**에 있으면 축제 구역으로 인식되며, 진입 시 '축제 참여중'으로 표시됩니다.
- **행사 새로고침**: 사이드메뉴에서 '행사 새로고침'을 누르면 현재 위치를 다시 가져와 구역을 재판정합니다. 구역에 있으면 참여 칩/카드가 유지되고, 밖에 있으면 해제됩니다.
- 축제 구역에 **1초 이상** 있으면 진입·퇴장·체류 시간이 참여 기록으로 저장됩니다.
- **5분 이상** 체류한 행사는 마이페이지 '참여한 축제'에 참여 완료로 기록됩니다.
- **30분 이상** 체류한 행사는 마이페이지 '체류 미션 기록'에 표시됩니다.

### 게시판
- 카테고리: 전체, 후기, 질문, 자유. 후기 탭에서는 '축제 선택'으로 특정 행사 글만 볼 수 있습니다.
- 정렬: 최신글 / 인기글.
- **본인 글** 더보기(⋯): 저장, 수정, 삭제(빨간색). **다른 사람 글** 더보기: 저장, 신고, 차단.
- 게시글 상세에서도 동일하게 본인 글은 저장·수정·삭제, 타인 글은 저장·신고·차단 메뉴가 나옵니다.
- 상단 공지사항 카드를 누르면 공지 목록을 볼 수 있습니다.

### 마이페이지
- 저장한 글, 참여한 축제, 체류 미션 기록, 신고 내역, 차단 목록, 이용 안내 등 메뉴를 이용할 수 있습니다.
- 지도에서 축제 구역에 있는 동안에는 '참여 중인 축제' 카드가 마이페이지 상단에 표시됩니다.

---
작성법: ## 큰 제목, ### 소제목, 일반 문단. 빈 줄로 문단을 나눌 수 있습니다.`;

export default function AdminGuideScreen() {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    contentService
      .getUsageGuide()
      .then(setContent)
      .catch((e) => setError(e instanceof Error ? e.message : '불러오기 실패'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await contentService.updateUsageGuide(content);
      Alert.alert('저장 완료', '이용 안내가 수정되었습니다.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '이용 안내 수정',
          headerShown: true,
          headerTitleAlign: 'left',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={8} style={{ paddingHorizontal: 4 }}>
              <Ionicons name="chevron-back" size={22} color="#111827" />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={80}
        >
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#6366F1" />
            </View>
          ) : (
            <>
              <Text style={styles.hint}>
                앱 사이드메뉴 {'>'} 이용 안내에서 표시되는 문구입니다. {'\n'}
                ## 제목, ### 소제목, 일반 문단을 사용할 수 있습니다.
              </Text>
              <TextInput
                style={styles.input}
                value={content}
                onChangeText={setContent}
                placeholder={PLACEHOLDER}
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Pressable
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>저장</Text>
                )}
              </Pressable>
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hint: {
    fontSize: 12,
    color: '#6B7280',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 14,
    color: '#111827',
    minHeight: 280,
  },
  errorText: { fontSize: 13, color: '#DC2626', paddingHorizontal: 16, marginBottom: 8 },
  saveButton: {
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 14,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
});
