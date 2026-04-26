import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { submitSurvey } from '../services/survey.service';

type Props = {
  visible: boolean;
  eventId: number;
  eventTitle: string;
  onClose: () => void;
  onSubmitted: () => void;
};

export default function FestivalSurveyModal({ visible, eventId, eventTitle, onClose, onSubmitted }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('알림', '이름을 입력해주세요.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('알림', '전화번호를 입력해주세요.');
      return;
    }
    setSaving(true);
    try {
      await submitSurvey({
        eventId,
        eventTitle,
        name: name.trim(),
        phone: phone.trim(),
        feedback: feedback.trim() || undefined,
      });
      Alert.alert('감사합니다! 🎉', '설문이 제출되었습니다.\n선물은 추후 안내드립니다.', [
        { text: '확인', onPress: onSubmitted },
      ]);
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '설문 제출 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          {/* 핸들 */}
          <View style={styles.handle} />

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* 헤더 */}
            <View style={styles.header}>
              <View style={styles.giftBadge}>
                <Ionicons name="gift-outline" size={16} color="#7C3AED" />
                <Text style={styles.giftBadgeText}>선물 증정</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </Pressable>
            </View>

            <Text style={styles.title}>축제 참여 완료!</Text>
            <Text style={styles.subtitle}>
              <Text style={styles.eventName}>{eventTitle}</Text>
              {' '}참여를 완료하셨습니다.{'\n'}
              설문에 응해주시면 선물을 드립니다 🎁
            </Text>

            <Text style={styles.label}>이름 <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="이름을 입력해주세요"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>전화번호 <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="010-0000-0000"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>축제 피드백 <Text style={styles.optional}>(선택)</Text></Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={feedback}
              onChangeText={setFeedback}
              placeholder="축제 참여 소감이나 개선사항을 자유롭게 남겨주세요."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Pressable
              style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>설문 제출하기</Text>
              )}
            </Pressable>

            <Pressable style={styles.laterBtn} onPress={onClose}>
              <Text style={styles.laterBtnText}>나중에 하기</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  giftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  giftBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C3AED',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 24,
  },
  eventName: {
    fontWeight: '700',
    color: '#111827',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  required: {
    color: '#EF4444',
  },
  optional: {
    fontSize: 12,
    fontWeight: '400',
    color: '#9CA3AF',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputMultiline: {
    minHeight: 100,
  },
  submitBtn: {
    backgroundColor: '#6366F1',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  laterBtn: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  laterBtnText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
