// app/profile/index.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import * as authService from '../../services/auth.service';

export default function ProfileScreen() {
  const router = useRouter();
  const { login: setAuthUser, isLoggedIn, user: authUser, refreshUser } = useAuth();
  const [email, setEmail] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [serverLoadFailed, setServerLoadFailed] = useState(false);

  const loadMe = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    setServerLoadFailed(false);
    try {
      const me = await authService.getMe();
      if (me) {
        setEmail(me.email);
        setNickname(me.nickname ?? '');
      } else if (authUser) {
        const storedEmail = await authService.getStoredUserEmail();
        const displayName = authUser.name?.replace(/님$/, '') ?? '';
        setEmail(storedEmail ?? '(저장된 이메일 없음)');
        setNickname(displayName);
        setServerLoadFailed(true);
      } else {
        setEmail(null);
        setNickname('');
      }
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useFocusEffect(
    useCallback(() => {
      loadMe();
    }, [loadMe])
  );

  const handleSaveNickname = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) {
      setErrorMessage('닉네임을 입력해 주세요.');
      return;
    }
    setErrorMessage('');
    setSaving(true);
    try {
      const updated = await authService.updateNickname(trimmed);
      const storedEmail = await authService.getStoredUserEmail();
      if (storedEmail) await authService.saveNicknameForEmail(storedEmail, updated.nickname);
      const newId = authUser?.id ?? updated.id;
      if (updated.id != null) await authService.setStoredUserId(updated.id);
      setAuthUser({ name: updated.nickname, id: newId });
      setEmail(updated.email);
      setNickname(updated.nickname);
      setServerLoadFailed(false);
      await refreshUser();
      Alert.alert('저장됨', '닉네임이 변경되었습니다.');
    } catch (e) {
      let msg = e instanceof Error ? e.message : '닉네임 변경에 실패했습니다.';
      if (msg.includes('401') || msg.includes('403') || msg.includes('로그인이 필요')) {
        msg = '로그인이 만료되었습니다. 다시 로그인해 주세요.';
      }
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>프로필</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : !email ? (
        <View style={styles.content}>
          {isLoggedIn ? (
            <>
              <Text style={styles.needLogin}>정보를 불러올 수 없습니다. 연결을 확인한 뒤 다시 시도해 주세요.</Text>
              <Pressable style={styles.loginButton} onPress={loadMe}>
                <Text style={styles.loginButtonText}>다시 시도</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.needLogin}>로그인이 필요합니다.</Text>
              <Pressable style={styles.loginButton} onPress={() => router.push('/login')}>
                <Text style={styles.loginButtonText}>로그인</Text>
              </Pressable>
            </>
          )}
        </View>
      ) : (
        <View style={styles.content}>
          {serverLoadFailed ? (
            <View style={styles.fallbackBanner}>
              <Text style={styles.fallbackBannerText}>서버에서 정보를 불러오지 못했습니다. 저장된 정보를 표시합니다.</Text>
              <Pressable style={styles.secondaryButton} onPress={loadMe}>
                <Text style={styles.secondaryButtonText}>서버에서 다시 불러오기</Text>
              </Pressable>
            </View>
          ) : null}
          <View style={styles.row}>
            <Text style={styles.label}>이메일</Text>
            <Text style={styles.value}>{email}</Text>
          </View>
          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.label}>닉네임</Text>
            <TextInput
              style={[styles.input, errorMessage ? styles.inputError : null]}
              value={nickname}
              onChangeText={(t) => {
                setNickname(t);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="닉네임을 입력하세요"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              editable={!saving}
            />
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            <Pressable
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSaveNickname}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>저장</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  headerRight: {
    width: 24,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  needLogin: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 16,
  },
  fallbackBanner: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  fallbackBannerText: {
    fontSize: 13,
    color: '#92400E',
    marginBottom: 8,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F59E0B',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loginButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  loginButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  row: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  value: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginBottom: 8,
  },
  saveButton: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#2563EB',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
