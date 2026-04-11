// 관리자 - 푸시 알림 발송 (POST /api/admin/notifications/send-all)
import React, { useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import * as adminService from '../../../services/admin.service';

export default function AdminPushScreen() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<adminService.PushResponse | null>(null);

  const handleSendAll = async () => {
    if (!title.trim()) {
      Alert.alert('알림', '제목을 입력해주세요.');
      return;
    }
    if (!body.trim()) {
      Alert.alert('알림', '내용을 입력해주세요.');
      return;
    }

    Alert.alert(
      '전체 발송 확인',
      '모든 사용자에게 푸시 알림을 발송합니다. 계속할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '발송',
          onPress: async () => {
            setSending(true);
            setResult(null);
            try {
              const res = await adminService.sendPushToAll(title.trim(), body.trim());
              setResult(res);
              if (res.success) {
                Alert.alert('발송 완료', `${res.sentCount}명에게 발송되었습니다.`);
                setTitle('');
                setBody('');
              } else {
                Alert.alert('발송 실패', res.message);
              }
            } catch (e) {
              Alert.alert('오류', e instanceof Error ? e.message : '발송 실패');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconWrapper}>
            <Ionicons name="notifications" size={32} color="#6366F1" />
          </View>
          <Text style={styles.headerTitle}>푸시 알림 발송</Text>
          <Text style={styles.headerDesc}>
            모든 사용자에게 푸시 알림을 발송합니다.
          </Text>
        </View>

        <Text style={styles.label}>제목</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="알림 제목을 입력하세요"
          placeholderTextColor="#9CA3AF"
          maxLength={50}
        />
        <Text style={styles.charCount}>{title.length}/50</Text>

        <Text style={styles.label}>내용</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={body}
          onChangeText={setBody}
          placeholder="알림 내용을 입력하세요"
          placeholderTextColor="#9CA3AF"
          multiline
          textAlignVertical="top"
          maxLength={200}
        />
        <Text style={styles.charCount}>{body.length}/200</Text>

        {result && (
          <View style={[styles.resultCard, result.success ? styles.resultSuccess : styles.resultFail]}>
            <Ionicons
              name={result.success ? 'checkmark-circle' : 'alert-circle'}
              size={24}
              color={result.success ? '#10B981' : '#EF4444'}
            />
            <View style={styles.resultText}>
              <Text style={styles.resultTitle}>
                {result.success ? '발송 완료' : '발송 실패'}
              </Text>
              <Text style={styles.resultDesc}>
                성공: {result.sentCount}명 / 실패: {result.failedCount}명
              </Text>
            </View>
          </View>
        )}

        <Pressable
          style={[styles.sendButton, sending && styles.sendButtonDisabled]}
          onPress={handleSendAll}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#FFFFFF" />
              <Text style={styles.sendButtonText}>전체 발송</Text>
            </>
          )}
        </Pressable>

        <View style={styles.warning}>
          <Ionicons name="warning-outline" size={18} color="#F59E0B" />
          <Text style={styles.warningText}>
            푸시 알림은 취소할 수 없습니다. 발송 전 내용을 다시 한번 확인해주세요.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { padding: 16, paddingBottom: 32 },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerDesc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
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
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
  },
  resultSuccess: {
    backgroundColor: '#ECFDF5',
  },
  resultFail: {
    backgroundColor: '#FEF2F2',
  },
  resultText: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  resultDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
});
