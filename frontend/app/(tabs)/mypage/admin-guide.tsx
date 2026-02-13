// app/(tabs)/mypage/admin-guide.tsx - 관리자: 이용 안내 수정
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

### 지도
- 지도에서 축제·행사 마커를 탭하면 행사 정보를 볼 수 있습니다.
- 날짜: 달력에서 이어서 최대 10일까지 구간 선택 가능합니다.
- 거리: 300m, 500m, 1km, 2km, 5km 선택 시 내 위치 기준 반경이 지도에 표시됩니다.
- 축제 목록 보기: 지도 화면 지역 기준, 가까운 순 최대 20개 표시됩니다.
- 200m 이내 진입 시 축제 구역 참여로 인정됩니다.

### 참여 기록
- 축제 구역에 1초 이상 있으면 참여 기록이 저장됩니다.
- 30분 이상 체류 시 참여 완료로 마이페이지에 반영됩니다.

(## 제목, ### 소제목, 일반 문단으로 작성 가능)`;

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
