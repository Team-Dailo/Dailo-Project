// 관리자 - FAQ 등록/수정
import React, { useCallback, useEffect, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as adminService from '../../../services/admin.service';

const CATEGORIES = ['일반', '계정', '행사', '게시판', '기타'];

export default function AdminFaqEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await adminService.getAdminFaqDetail(parseInt(id, 10));
      setCategory(data.category);
      setQuestion(data.question);
      setAnswer(data.answer);
      setDisplayOrder(String(data.displayOrder));
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : 'FAQ 조회 실패');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (isEdit) loadDetail();
  }, [isEdit, loadDetail]);

  const handleSave = async () => {
    if (!question.trim()) {
      Alert.alert('알림', '질문을 입력해주세요.');
      return;
    }
    if (!answer.trim()) {
      Alert.alert('알림', '답변을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      const body: adminService.FaqCreateRequest = {
        category,
        question: question.trim(),
        answer: answer.trim(),
        displayOrder: parseInt(displayOrder, 10) || 0,
      };

      if (isEdit) {
        await adminService.updateFaq(parseInt(id!, 10), body);
        Alert.alert('완료', 'FAQ가 수정되었습니다.', [{ text: '확인', onPress: () => router.back() }]);
      } else {
        await adminService.createFaq(body);
        Alert.alert('완료', 'FAQ가 등록되었습니다.', [{ text: '확인', onPress: () => router.back() }]);
      }
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>카테고리</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}>
                {cat}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>질문</Text>
        <TextInput
          style={styles.input}
          value={question}
          onChangeText={setQuestion}
          placeholder="질문을 입력하세요"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.label}>답변</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={answer}
          onChangeText={setAnswer}
          placeholder="답변을 입력하세요"
          placeholderTextColor="#9CA3AF"
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.label}>표시 순서</Text>
        <TextInput
          style={styles.input}
          value={displayOrder}
          onChangeText={setDisplayOrder}
          placeholder="0"
          placeholderTextColor="#9CA3AF"
          keyboardType="number-pad"
        />

        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>{isEdit ? '수정' : '등록'}</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    height: 120,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#6B7280',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
