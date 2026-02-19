// app/(tabs)/mypage/admin-privacy-policy.tsx - 관리자: 개인정보처리방침 수정
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { useSafeBack } from '../../../hooks/useSafeBack';

const PLACEHOLDER = `## '다일로(Dailo)' 개인정보처리방침

설정 > 개인정보처리방침에서 사용자에게 표시되는 문구입니다.
## 큰 제목, ### 소제목, 일반 문단을 사용할 수 있습니다.`;

export default function AdminPrivacyPolicyScreen() {
  const safeBack = useSafeBack();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    contentService
      .getPrivacyPolicy()
      .then(setContent)
      .catch((e) => setError(e instanceof Error ? e.message : '불러오기 실패'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await contentService.updatePrivacyPolicy(content);
      Alert.alert('저장 완료', '개인정보처리방침이 수정되었습니다.', [
        { text: '확인', onPress: safeBack },
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
          title: '개인정보처리방침 수정',
          headerShown: true,
          headerTitleAlign: 'center',
          headerLeft: () => (
            <Pressable onPress={safeBack} hitSlop={8} style={{ paddingHorizontal: 4 }}>
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
                설정 {'>'} 개인정보처리방침에서 표시되는 문구입니다.{'\n'}
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
