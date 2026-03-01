// app/(tabs)/mypage/contact.tsx - 문의하기 (폼 제출 → 관리자 페이지에서 확인)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as inquiryService from '../../../services/inquiry.service';
import { useAuth } from '../../../hooks/useAuth';
import { useSafeBack } from '../../../hooks/useSafeBack';

const MAX_TITLE = 500;
const MAX_CONTENT = 5000;

export default function ContactScreen() {
  const { user, isLoggedIn } = useAuth();
  const safeBack = useSafeBack();
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState(isLoggedIn && user?.email ? user.email : '');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedEmail) {
      Alert.alert('입력 오류', '이메일을 입력해 주세요.');
      return;
    }
    if (!trimmedTitle) {
      Alert.alert('입력 오류', '제목을 입력해 주세요.');
      return;
    }
    if (!trimmedContent) {
      Alert.alert('입력 오류', '내용을 입력해 주세요.');
      return;
    }
    if (trimmedTitle.length > MAX_TITLE) {
      Alert.alert('입력 오류', `제목은 ${MAX_TITLE}자 이내로 입력해 주세요.`);
      return;
    }
    if (trimmedContent.length > MAX_CONTENT) {
      Alert.alert('입력 오류', `내용은 ${MAX_CONTENT}자 이내로 입력해 주세요.`);
      return;
    }

    setSubmitting(true);
    try {
      await inquiryService.submitInquiry({
        email: trimmedEmail,
        title: trimmedTitle,
        content: trimmedContent,
      });
      Alert.alert('전송 완료', '문의가 접수되었습니다. 확인 후 연락드리겠습니다.', [
        { text: '확인', onPress: () => { setTitle(''); setContent(''); setShowForm(false); safeBack(); } },
      ]);
    } catch (e) {
      Alert.alert('전송 실패', e instanceof Error ? e.message : '문의 전송에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const openNotice = () => {
    router.push('/board/notice');
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: '문의하기',
          headerShown: true,
          headerTitleAlign: 'center',
          headerLeft: () => (
            <Pressable onPress={safeBack} hitSlop={8} style={styles.headerBackButton}>
              <Ionicons name="chevron-back" size={22} color="#111827" />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
        >
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.description}>
              서비스 이용 중 궁금한 점이나 불편 사항을 남겨 주시면 확인 후 연락드리겠습니다.
            </Text>

            {!showForm ? (
              <>
                {/* 공지사항 보기 버튼 (요청으로 인해 일시 비노출)
                <Pressable style={styles.linkRow} onPress={openNotice}>
                  <Ionicons name="newspaper-outline" size={20} color="#6B7280" />
                  <Text style={styles.linkText}>공지사항 보기</Text>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </Pressable>
                */}
                <Pressable
                  style={styles.startButton}
                  onPress={() => setShowForm(true)}
                >
                  <Ionicons name="mail-outline" size={24} color="#FFFFFF" />
                  <Text style={styles.startButtonText}>문의하기</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.card}>
              <Text style={styles.label}>이메일</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="답변 받을 이메일을 입력하세요"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!submitting}
              />

              <Text style={[styles.label, { marginTop: 16 }]}>제목</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="문의 제목을 입력하세요"
                placeholderTextColor="#9CA3AF"
                maxLength={MAX_TITLE}
                editable={!submitting}
              />
              <Text style={styles.count}>{title.length}/{MAX_TITLE}</Text>

              <Text style={[styles.label, { marginTop: 16 }]}>내용</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={content}
                onChangeText={setContent}
                placeholder="문의 내용을 자세히 입력해 주세요"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={6}
                maxLength={MAX_CONTENT}
                textAlignVertical="top"
                editable={!submitting}
              />
              <Text style={styles.count}>{content.length}/{MAX_CONTENT}</Text>
            </View>

            <Pressable
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>보내기</Text>
              )}
            </Pressable>

                {/* 공지사항 보기 버튼 (요청으로 인해 일시 비노출)
                <Pressable style={styles.linkRow} onPress={openNotice}>
                  <Ionicons name="newspaper-outline" size={20} color="#6B7280" />
                  <Text style={styles.linkText}>공지사항 보기</Text>
                  <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                </Pressable>
                */}
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  headerBackButton: { paddingLeft: 4, paddingRight: 10 },
  safeArea: { flex: 1, backgroundColor: '#F9FAFB' },
  keyboard: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    minHeight: 140,
    paddingTop: 12,
  },
  count: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'right',
  },
  submitButton: {
    backgroundColor: '#4C8BF5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 8,
  },
  linkText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },
  startButton: {
    backgroundColor: '#4C8BF5',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    minHeight: 56,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
