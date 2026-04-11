// 관리자 - 배너 등록/수정
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
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as adminService from '../../../services/admin.service';

const LINK_TYPES: ('INTERNAL' | 'EXTERNAL' | 'NONE')[] = ['NONE', 'INTERNAL', 'EXTERNAL'];
const LINK_TYPE_LABELS: Record<string, string> = {
  NONE: '없음',
  INTERNAL: '앱 내부',
  EXTERNAL: '외부 링크',
};

export default function AdminBannerEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkType, setLinkType] = useState<'INTERNAL' | 'EXTERNAL' | 'NONE'>('NONE');
  const [linkUrl, setLinkUrl] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await adminService.getAdminBannerDetail(parseInt(id, 10));
      setTitle(data.title);
      setImageUrl(data.imageUrl);
      setLinkType(data.linkType);
      setLinkUrl(data.linkUrl ?? '');
      setDisplayOrder(String(data.displayOrder));
      setStartAt(data.startAt?.slice(0, 10) ?? '');
      setEndAt(data.endAt?.slice(0, 10) ?? '');
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '배너 조회 실패');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (isEdit) loadDetail();
  }, [isEdit, loadDetail]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        const uploadedUrl = await adminService.uploadAdminEventImage(result.assets[0].uri);
        setImageUrl(uploadedUrl);
      } catch (e) {
        Alert.alert('오류', e instanceof Error ? e.message : '이미지 업로드 실패');
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('알림', '제목을 입력해주세요.');
      return;
    }
    if (!imageUrl.trim()) {
      Alert.alert('알림', '이미지를 선택해주세요.');
      return;
    }

    setSaving(true);
    try {
      const body: adminService.BannerCreateRequest = {
        title: title.trim(),
        imageUrl: imageUrl.trim(),
        linkType,
        linkUrl: linkUrl.trim() || null,
        displayOrder: parseInt(displayOrder, 10) || 0,
        startAt: startAt ? `${startAt}T00:00:00` : null,
        endAt: endAt ? `${endAt}T23:59:59` : null,
      };

      if (isEdit) {
        await adminService.updateBanner(parseInt(id!, 10), body);
        Alert.alert('완료', '배너가 수정되었습니다.', [{ text: '확인', onPress: () => router.back() }]);
      } else {
        await adminService.createBanner(body);
        Alert.alert('완료', '배너가 등록되었습니다.', [{ text: '확인', onPress: () => router.back() }]);
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
        <Text style={styles.label}>배너 이미지</Text>
        <Pressable style={styles.imagePicker} onPress={handlePickImage}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.previewImage} resizeMode="cover" />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="image-outline" size={32} color="#9CA3AF" />
              <Text style={styles.placeholderText}>이미지 선택</Text>
            </View>
          )}
        </Pressable>

        <Text style={styles.label}>제목</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="배너 제목"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.label}>링크 타입</Text>
        <View style={styles.chipRow}>
          {LINK_TYPES.map((type) => (
            <Pressable
              key={type}
              style={[styles.chip, linkType === type && styles.chipActive]}
              onPress={() => setLinkType(type)}
            >
              <Text style={[styles.chipText, linkType === type && styles.chipTextActive]}>
                {LINK_TYPE_LABELS[type]}
              </Text>
            </Pressable>
          ))}
        </View>

        {linkType !== 'NONE' && (
          <>
            <Text style={styles.label}>링크 URL</Text>
            <TextInput
              style={styles.input}
              value={linkUrl}
              onChangeText={setLinkUrl}
              placeholder={linkType === 'INTERNAL' ? '앱 내부 경로' : 'https://...'}
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
            />
          </>
        )}

        <Text style={styles.label}>표시 순서</Text>
        <TextInput
          style={styles.input}
          value={displayOrder}
          onChangeText={setDisplayOrder}
          placeholder="0"
          placeholderTextColor="#9CA3AF"
          keyboardType="number-pad"
        />

        <Text style={styles.label}>시작일 (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={startAt}
          onChangeText={setStartAt}
          placeholder="2024-01-01"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.label}>종료일 (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={endAt}
          onChangeText={setEndAt}
          placeholder="2024-12-31"
          placeholderTextColor="#9CA3AF"
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
  imagePicker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 160,
  },
  placeholder: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  chipText: {
    fontSize: 14,
    color: '#6B7280',
  },
  chipTextActive: {
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
