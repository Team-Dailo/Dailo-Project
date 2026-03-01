// 관리자 - 문의 상세 (GET /api/admin/inquiries/:id)
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as inquiryService from '../../../services/inquiry.service';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return '-';
  }
}

export default function AdminInquiryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<inquiryService.InquiryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      const data = await inquiryService.getInquiryById(numId);
      setItem(data);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
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

      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>목록으로</Text>
      </Pressable>
    </ScrollView>
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
  label: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginBottom: 4 },
  value: { fontSize: 15, color: '#111827' },
  body: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginTop: 4,
  },
  backButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: { fontSize: 15, color: '#6366F1', fontWeight: '500' },
});
