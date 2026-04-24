import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '../../hooks/useAuth';
import { useSafeBack } from '../../hooks/useSafeBack';
import * as authService from '../../services/auth.service';

export default function LoginScreen() {
  const { login } = useAuth();
  const safeBack = useSafeBack();
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      safeBack();
      return true;
    });
    return () => sub.remove();
  }, [safeBack]);

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [emailVerificationMessage, setEmailVerificationMessage] = useState('');

  const handleLogin = async () => {
    const trimmed = email.trim();
    setErrorMessage('');
    setEmailVerificationMessage('');

    if (!trimmed || !password) {
      Alert.alert('입력 오류', '이메일과 비밀번호를 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const user = await authService.login(trimmed, password);
      login(user);
      router.replace('/(tabs)/home');
    } catch (e) {
      const message = e instanceof Error ? e.message : '로그인에 실패했습니다.';
      if (message.startsWith('EMAIL_VERIFICATION_REQUIRED:')) {
        const displayMsg =
          message.slice('EMAIL_VERIFICATION_REQUIRED:'.length).trim() ||
          '로그인 확인 이메일을 발송했습니다. Gmail에서 확인 링크를 눌러 주세요.';
        setEmailVerificationMessage(displayMsg);
        setErrorMessage('');
        return;
      }
      setErrorMessage(message);
      Alert.alert('로그인 실패', message, [{ text: '확인' }]);
    } finally {
      setLoading(false);
    }
  };

  const [kakaoLoading, setKakaoLoading] = useState(false);
  const kakaoLoginInFlightRef = useRef(false);

  const handleKakaoLogin = async () => {
    if (kakaoLoginInFlightRef.current) return;

    kakaoLoginInFlightRef.current = true;
    setKakaoLoading(true);

    try {
      const { login: kakaoLogin } = await import('@react-native-kakao/user');
      const token = await kakaoLogin();
      const accessToken = token?.accessToken;

      if (!accessToken) {
        Alert.alert('카카오 로그인', '카카오톡 로그인을 취소했거나 토큰을 받지 못했습니다.');
        return;
      }

      const tokenDto = await authService.getKakaoNativeTokenDto(accessToken);
      const user = await authService.loginWithSocialToken(tokenDto);

      login({
        name: user.name,
        id: user.id,
        email: user.email,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
      });

      router.replace('/(tabs)/home');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '카카오 로그인에 실패했습니다.';
      Alert.alert('카카오 로그인 실패', msg);
    } finally {
      kakaoLoginInFlightRef.current = false;
      setKakaoLoading(false);
    }
  };

  // Apple 로그인 (iOS만 지원)
  const [appleLoading, setAppleLoading] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);

  useEffect(() => {
    // Apple Sign In 사용 가능 여부 확인 (iOS 13+)
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable);
    }
  }, []);

  const handleAppleLogin = async () => {
    if (appleLoading) return;
    setAppleLoading(true);

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('[AppleLogin] credential received:', {
        user: credential.user?.substring(0, 20) + '...',
        email: credential.email,
        fullName: credential.fullName,
        identityToken: credential.identityToken ? 'exists' : 'null',
      });

      if (!credential.identityToken) {
        Alert.alert('Apple 로그인', 'Apple 로그인 토큰을 받지 못했습니다.');
        return;
      }

      // fullName 조합 (최초 로그인 시에만 제공됨)
      const fullName = [
        credential.fullName?.givenName,
        credential.fullName?.familyName,
      ]
        .filter(Boolean)
        .join(' ')
        .trim() || null;

      const tokenDto = await authService.getAppleTokenDto({
        identityToken: credential.identityToken,
        user: credential.user,
        fullName,
        email: credential.email,
      });

      const user = await authService.loginWithSocialToken(tokenDto);

      login({
        name: user.name,
        id: user.id,
        email: user.email,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
      });

      router.replace('/(tabs)/home');
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e) {
        const appleError = e as { code: string };
        if (appleError.code === 'ERR_REQUEST_CANCELED') {
          // 사용자가 취소한 경우 조용히 무시
          console.log('[AppleLogin] User canceled');
          return;
        }
      }
      const msg = e instanceof Error ? e.message : 'Apple 로그인에 실패했습니다.';
      Alert.alert('Apple 로그인 실패', msg);
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable hitSlop={12} onPress={safeBack}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle}>로그인</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.body}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="아이디 (이메일)"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputWrap}>
            <TextInput
              style={[styles.input, errorMessage ? styles.inputError : null]}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="비밀번호"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={true}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="oneTimeCode"
            />
            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}
            {emailVerificationMessage ? (
              <Text style={styles.emailVerifyText}>{emailVerificationMessage}</Text>
            ) : null}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              pressed && styles.loginButtonPressed,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>로그인</Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.kakaoLoginButton,
              (pressed || kakaoLoading) && styles.kakaoLoginButtonPressed,
            ]}
            onPress={handleKakaoLogin}
            disabled={kakaoLoading}
          >
            {kakaoLoading ? (
              <ActivityIndicator color="#111827" />
            ) : (
              <>
                <Ionicons name="chatbubble" size={18} color="#111827" />
                <Text style={styles.kakaoLoginButtonText}>카카오 로그인</Text>
              </>
            )}
          </Pressable>

          {/* Apple 로그인 버튼 (iOS만 표시) */}
          {Platform.OS === 'ios' && isAppleAvailable && (
            <Pressable
              style={({ pressed }) => [
                styles.appleLoginButton,
                (pressed || appleLoading) && styles.appleLoginButtonPressed,
              ]}
              onPress={handleAppleLogin}
              disabled={appleLoading}
            >
              {appleLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                  <Text style={styles.appleLoginButtonText}>Apple로 로그인</Text>
                </>
              )}
            </Pressable>
          )}

          <Pressable
            style={styles.signupLink}
            onPress={() => router.push('/signup')}
          >
            <Text style={styles.signupLinkText}>계정이 없으신가요? 회원가입</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 20,
  },
  headerRight: {
    width: 24,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  inputWrap: {
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 6,
    marginLeft: 2,
  },
  emailVerifyText: {
    fontSize: 13,
    color: '#2563EB',
    marginTop: 10,
    marginLeft: 2,
    lineHeight: 18,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 4,
    backgroundColor: '#4C8BF5',
    marginTop: 8,
  },
  loginButtonPressed: {
    opacity: 0.9,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  signupLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  signupLinkText: {
    fontSize: 14,
    color: '#4C8BF5',
    fontWeight: '500',
  },
  kakaoLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 4,
    backgroundColor: '#FEE500',
    marginTop: 12,
  },
  kakaoLoginButtonPressed: {
    opacity: 0.9,
  },
  kakaoLoginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  // Apple 로그인 버튼 스타일 (Apple HIG 준수)
  appleLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 4,
    backgroundColor: '#000000',
    marginTop: 12,
  },
  appleLoginButtonPressed: {
    opacity: 0.9,
  },
  appleLoginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});