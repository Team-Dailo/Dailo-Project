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
  Image,
  Modal,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../hooks/useAuth';
import * as authService from '../../services/auth.service';

const AVATAR_PLACEHOLDER = 'https://via.placeholder.com/120x120.png?text=👤';

export default function ProfileScreen() {
  const router = useRouter();
  const { login: setAuthUser, isLoggedIn, user: authUser, refreshUser, updateUserProfileImage } = useAuth();
  const [email, setEmail] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
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
        setProfileImageUrl(me.profileImageUrl ?? null);
      } else if (authUser) {
        const storedEmail = await authService.getStoredUserEmail();
        const displayName = authUser.name?.replace(/님$/, '') ?? '';
        setEmail(storedEmail ?? '(저장된 이메일 없음)');
        setNickname(displayName);
        setServerLoadFailed(true);
      } else {
        setEmail(null);
        setNickname('');
        setProfileImageUrl(null);
      }
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  const handlePickPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '앨범 접근 권한이 필요합니다.');
      return;
    }
    // allowsEditing: false → 크롭 화면 없이 바로 선택만 하고, 확인은 앱 모달에서 진행 (다음으로 넘어갈 수 없던 문제 해결)
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setPendingPhotoUri(result.assets[0].uri);
  }, []);

  const handleConfirmPhoto = useCallback(async () => {
    if (!pendingPhotoUri) return;
    setUploadingPhoto(true);
    try {
      const url = await authService.uploadProfileImage(pendingPhotoUri);
      await authService.updateProfile({ profileImageUrl: url });
      setProfileImageUrl(url);
      updateUserProfileImage(url);
      setPendingPhotoUri(null);
      await refreshUser();
      Alert.alert('저장됨', '프로필 사진이 변경되었습니다.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '프로필 사진 변경에 실패했습니다.';
      Alert.alert('오류', msg);
    } finally {
      setUploadingPhoto(false);
    }
  }, [pendingPhotoUri, refreshUser, updateUserProfileImage]);

  const handleCancelPendingPhoto = useCallback(() => {
    setPendingPhotoUri(null);
  }, []);

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
          <ActivityIndicator size="large" color="#4C8BF5" />
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
          <View style={styles.avatarSection}>
            <Image
              source={{ uri: pendingPhotoUri ?? profileImageUrl ?? AVATAR_PLACEHOLDER }}
              style={styles.avatar}
            />
            <Pressable
              style={[styles.changePhotoBtn, uploadingPhoto && styles.changePhotoBtnDisabled]}
              onPress={handlePickPhoto}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="#4C8BF5" />
              ) : (
                <Text style={styles.changePhotoBtnText}>프로필 사진 변경</Text>
              )}
            </Pressable>
            {pendingPhotoUri ? (
              <View style={styles.confirmPhotoRow}>
                <Pressable style={styles.cancelPhotoBtn} onPress={handleCancelPendingPhoto} disabled={uploadingPhoto}>
                  <Text style={styles.cancelPhotoBtnText}>취소</Text>
                </Pressable>
                <Pressable style={styles.confirmPhotoBtn} onPress={handleConfirmPhoto} disabled={uploadingPhoto}>
                  {uploadingPhoto ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmPhotoBtnText}>확인</Text>
                  )}
                </Pressable>
              </View>
            ) : null}
          </View>

          {/* 선택한 사진 확인 모달: 크롭 화면에서 돌아온 뒤 확인 버튼이 잘 보이도록 */}
          <Modal
            visible={!!pendingPhotoUri}
            transparent
            animationType="fade"
            onRequestClose={handleCancelPendingPhoto}
          >
            <Pressable style={styles.modalOverlay} onPress={handleCancelPendingPhoto}>
              <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
                <Text style={styles.modalTitle}>이 사진으로 할까요?</Text>
                <Image source={{ uri: pendingPhotoUri ?? '' }} style={styles.modalPreview} />
                <View style={styles.modalButtons}>
                  <Pressable style={styles.modalCancelBtn} onPress={handleCancelPendingPhoto} disabled={uploadingPhoto}>
                    <Text style={styles.modalCancelBtnText}>취소</Text>
                  </Pressable>
                  <Pressable style={styles.modalConfirmBtn} onPress={handleConfirmPhoto} disabled={uploadingPhoto}>
                    {uploadingPhoto ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalConfirmBtnText}>확인</Text>
                    )}
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
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
    marginLeft: 20,
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F3F4F6',
  },
  changePhotoBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
  },
  changePhotoBtnDisabled: {
    opacity: 0.7,
  },
  changePhotoBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4C8BF5',
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
    backgroundColor: '#4C8BF5',
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
    backgroundColor: '#4C8BF5',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  confirmPhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  cancelPhotoBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  cancelPhotoBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmPhotoBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#4C8BF5',
  },
  confirmPhotoBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  modalPreview: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#F3F4F6',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  modalCancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalConfirmBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#4C8BF5',
    minWidth: 100,
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
