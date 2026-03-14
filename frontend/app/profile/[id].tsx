// app/profile/[id].tsx - 타 사용자 프로필 화면
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as authService from '../../services/auth.service';
import { useAuth } from '../../hooks/useAuth';

const DEFAULT_PROFILE_IMAGE = require('../../assets/images/default-profile.png');

export default function MemberProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<authService.MemberProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const memberId = Number(id);
  const isMyProfile = currentUser?.id != null && Number(currentUser.id) === memberId;

  useEffect(() => {
    if (!memberId || memberId <= 0) {
      setError(true);
      setLoading(false);
      return;
    }

    // 본인 프로필이면 /profile로 리다이렉트
    if (isMyProfile) {
      router.replace('/profile');
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      setError(false);
      const data = await authService.getMemberProfile(memberId);
      if (data) {
        setProfile(data);
      } else {
        setError(true);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [memberId, isMyProfile, router]);

  const profileImageUrl = profile?.profileImageUrl?.trim();
  const hasProfileImage = profileImageUrl && profileImageUrl.length > 0;

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
      ) : error || !profile ? (
        <View style={styles.content}>
          <Text style={styles.errorText}>
            사용자를 찾을 수 없습니다.
          </Text>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>돌아가기</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.avatarSection}>
            {hasProfileImage ? (
              <Image
                source={{ uri: profileImageUrl }}
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.avatar}>
                <Image
                  source={DEFAULT_PROFILE_IMAGE}
                  style={[styles.avatar, styles.defaultProfileImageZoom]}
                  resizeMode="cover"
                />
              </View>
            )}
          </View>
          <View style={styles.infoSection}>
            <Text style={styles.nickname}>{profile.nickname}</Text>
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
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
    alignItems: 'center',
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
    overflow: 'hidden',
  },
  defaultProfileImageZoom: {
    position: 'absolute',
    transform: [{ scale: 1.35 }],
  },
  infoSection: {
    alignItems: 'center',
  },
  nickname: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111827',
  },
  errorText: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#4C8BF5',
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
