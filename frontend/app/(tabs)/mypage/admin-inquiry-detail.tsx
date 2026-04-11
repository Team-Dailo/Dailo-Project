// 관리자 - 문의 상세 + 답변 (GET /api/admin/inquiries/:id, PUT /api/admin/inquiries/:id/answer)
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as adminService from '../../../services/admin.service';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '-';
  }
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: '대기중',
  ANSWERED: '답변완료',
  CLOSED: '종료',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B',
  ANSWERED: '#10B981',
  CLOSED: '#6B7280',
};

export default function AdminInquiryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<adminService.InquiryDetailItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const numId = id ? parseInt(id, 10) : NaN;
    if (!Number.isInteger(numId) || numId <= 0) {
      setError('잘못된 문의 ID입니다.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.getAdminInquiryDetail(numId);
      setItem(data);
      setAnswer(data.answer ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : '상세 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      Alert.alert('알림', '답변 내용을 입력해주세요.');
      return;
    }
    if (!item) return;

    setSubmitting(true);
    try {
      const updated = await adminService.answerInquiry(item.id, answer.trim());
      setItem(updated);
      Alert.alert('완료', '답변이 등록되었습니다.');
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '답변 등록 실패');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!item) return;

    Alert.alert('종료 확인', '이 문의를 종료할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '종료',
        onPress: async () => {
          try {
            const updated = await adminService.closeInquiry(item.id);
            setItem(updated);
            Alert.alert('완료', '문의가 종료되었습니다.');
          } catch (e) {
            Alert.alert('오류', e instanceof Error ? e.message : '종료 실패');
          }
        },
      },
    ]);
  };

  if (loading && !item) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? '문의를 찾을 수 없습니다.'}</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>목록으로</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] ?? '#6B7280' }]}>
              <Text style={styles.badgeText}>{STATUS_LABELS[item.status] ?? item.status}</Text>
            </View>
          </View>

          <Text style={styles.label}>제목</Text>
          <Text style={styles.value}>{item.title}</Text>

          <Text style={[styles.label, { marginTop: 16 }]}>이메일</Text>
          <Text style={styles.value}>{item.email}</Text>

          <Text style={[styles.label, { marginTop: 16 }]}>작성일</Text>
          <Text style={styles.value}>{formatDate(item.createdAt)}</Text>

          {item.memberId != null && (
            <>
              <Text style={[styles.label, { marginTop: 16 }]}>회원 ID</Text>
              <Text style={styles.value}>{item.memberId}</Text>
            </>
          )}

          <Text style={[styles.label, { marginTop: 16 }]}>내용</Text>
          <Text style={styles.body}>{item.content}</Text>
        </View>

        {/* 답변 섹션 */}
        <View style={styles.card}>
          <View style={styles.answerHeader}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#6366F1" />
            <Text style={styles.answerTitle}>답변</Text>
          </View>

          {item.status === 'ANSWERED' && item.answer ? (
            <>
              <Text style={styles.answerContent}>{item.answer}</Text>
              <Text style={styles.answeredAt}>
                답변일: {formatDate(item.answeredAt)}
              </Text>
            </>
          ) : item.status === 'CLOSED' ? (
            <Text style={styles.closedText}>종료된 문의입니다.</Text>
          ) : (
            <>
              <TextInput
                style={styles.answerInput}
                value={answer}
                onChangeText={setAnswer}
                placeholder="답변 내용을 입력하세요"
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
              />
              <Pressable
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmitAnswer}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>답변 등록</Text>
                )}
              </Pressable>
            </>
          )}
        </View>

        {/* 액션 버튼들 */}
        <View style={styles.actionRow}>
          {item.status !== 'CLOSED' && (
            <Pressable style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="checkmark-circle-outline" size={18} color="#6B7280" />
              <Text style={styles.closeButtonText}>문의 종료</Text>
            </Pressable>
          )}
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>목록으로</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 14, color: '#DC2626', textAlign: 'center', marginBottom: 12 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    marginBottom: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  label: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 4 },
  value: { fontSize: 15, color: '#111827' },
  body: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginTop: 4,
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  answerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  answerContent: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  answeredAt: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 12,
  },
  closedText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  answerInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    height: 120,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  submitButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  closeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  closeButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: { fontSize: 15, color: '#6366F1', fontWeight: '500' },
});
