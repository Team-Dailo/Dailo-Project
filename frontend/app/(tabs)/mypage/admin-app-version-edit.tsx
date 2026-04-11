// 관리자 - 앱 버전 등록/수정
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
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as adminService from '../../../services/admin.service';

const PLATFORMS: ('IOS' | 'ANDROID')[] = ['IOS', 'ANDROID'];

export default function AdminAppVersionEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [platform, setPlatform] = useState<'IOS' | 'ANDROID'>('IOS');
  const [minimumVersion, setMinimumVersion] = useState('');
  const [latestVersion, setLatestVersion] = useState('');
  const [forceUpdate, setForceUpdate] = useState(false);
  const [storeUrl, setStoreUrl] = useState('');

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await adminService.getAdminAppVersionDetail(parseInt(id, 10));
      setPlatform(data.platform);
      setMinimumVersion(data.minimumVersion);
      setLatestVersion(data.latestVersion);
      setForceUpdate(data.forceUpdate);
      setStoreUrl(data.storeUrl ?? '');
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '앱 버전 조회 실패');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (isEdit) loadDetail();
  }, [isEdit, loadDetail]);

  const handleSave = async () => {
    if (!minimumVersion.trim()) {
      Alert.alert('알림', '최소 버전을 입력해주세요.');
      return;
    }
    if (!latestVersion.trim()) {
      Alert.alert('알림', '최신 버전을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      const body: adminService.AppVersionCreateRequest = {
        platform,
        minimumVersion: minimumVersion.trim(),
        latestVersion: latestVersion.trim(),
        forceUpdate,
        storeUrl: storeUrl.trim() || null,
      };

      if (isEdit) {
        await adminService.updateAppVersion(parseInt(id!, 10), body);
        Alert.alert('완료', '앱 버전 정보가 수정되었습니다.', [{ text: '확인', onPress: () => router.back() }]);
      } else {
        await adminService.createAppVersion(body);
        Alert.alert('완료', '앱 버전 정보가 등록되었습니다.', [{ text: '확인', onPress: () => router.back() }]);
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
        <Text style={styles.label}>플랫폼</Text>
        <View style={styles.chipRow}>
          {PLATFORMS.map((p) => (
            <Pressable
              key={p}
              style={[styles.chip, platform === p && styles.chipActive]}
              onPress={() => setPlatform(p)}
              disabled={isEdit}
            >
              <Ionicons
                name={p === 'IOS' ? 'logo-apple' : 'logo-android'}
                size={18}
                color={platform === p ? '#FFFFFF' : '#6B7280'}
              />
              <Text style={[styles.chipText, platform === p && styles.chipTextActive]}>
                {p}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>최소 버전</Text>
        <TextInput
          style={styles.input}
          value={minimumVersion}
          onChangeText={setMinimumVersion}
          placeholder="1.0.0"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.label}>최신 버전</Text>
        <TextInput
          style={styles.input}
          value={latestVersion}
          onChangeText={setLatestVersion}
          placeholder="1.0.0"
          placeholderTextColor="#9CA3AF"
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>강제 업데이트</Text>
          <Switch
            value={forceUpdate}
            onValueChange={setForceUpdate}
            trackColor={{ false: '#D1D5DB', true: '#6366F1' }}
            thumbColor="#FFFFFF"
          />
        </View>
        <Text style={styles.hint}>
          활성화 시 최소 버전 미만 사용자는 앱 사용이 제한됩니다.
        </Text>

        <Text style={styles.label}>스토어 URL (선택)</Text>
        <TextInput
          style={styles.input}
          value={storeUrl}
          onChangeText={setStoreUrl}
          placeholder="https://apps.apple.com/..."
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
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
  chipRow: {
    flexDirection: 'row',
    gap: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  switchLabel: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
    marginLeft: 4,
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
