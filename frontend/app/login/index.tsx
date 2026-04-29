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
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable);
    }
  }, []);

  // Apple login debug temporary code - START
  const handleAppleLogin = async () => {
    setAppleLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let debugRequest: any = null;

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      console.log('[handleAppleLogin] credential received');
      console.log('[handleAppleLogin] identityToken exists:', !!credential.identityToken);
      console.log('[handleAppleLogin] user:', credential.user);
      console.log('[handleAppleLogin] email:', credential.email);
      console.log('[handleAppleLogin] fullName raw:', JSON.stringify(credential.fullName));

      if (!credential.identityToken) {
        Alert.alert('Apple 로그인', 'Apple 로그인을 취소했거나 토큰을 받지 못했습니다.');
        return;
      }

      if (!credential.user) {
        Alert.alert('Apple 로그인', 'Apple 사용자 ID를 받지 못했습니다.');
        return;
      }

      // fullName을 문자열로 변환 (familyName + givenName 순서, 한국식)
      const fullName = credential.fullName
        ? [credential.fullName.familyName, credential.fullName.givenName]
            .filter(Boolean)
            .join('')
        : undefined;

      const requestBody = {
        identityToken: credential.identityToken,
        user: credential.user,
        email: credential.email ?? undefined,
        fullName: fullName || undefined,
      };

      // 디버그용 요청 정보 (민감정보 제거)
      debugRequest = {
        hasIdentityToken: !!requestBody.identityToken,
        identityTokenPreview: requestBody.identityToken
          ? requestBody.identityToken.slice(0, 20) + '...'
          : null,
        user: requestBody.user,
        email: requestBody.email ?? null,
        fullName: requestBody.fullName ?? null,
        fullNameType: typeof requestBody.fullName,
      };

      console.log('[Apple Login] request body debug:', debugRequest);

      const tokenDto = await authService.getAppleTokenDto(requestBody);

      const user = await authService.loginWithSocialToken(tokenDto);

      login({
        name: user.name,
        id: user.id,
        email: user.email,
        role: user.role,
        profileImageUrl: user.profileImageUrl,
      });

      router.replace('/(tabs)/home');
    } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED') {
        return;
      }

      console.log('[Apple Login] error:', e?.code, e?.message, e);

      // 사용자 친화적 에러 메시지
      let userMessage = 'Apple 로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
      if (e?.message?.includes('network') || e?.message?.includes('Network')) {
        userMessage = '네트워크 연결을 확인해 주세요.';
      } else if (e?.message?.includes('timeout')) {
        userMessage = '서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.';
      }

      Alert.alert('Apple 로그인 실패', userMessage);
    } finally {
      setAppleLoading(false);
    }
  };
  // Apple login debug temporary code - END

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

          {Platform.OS === 'ios' && isAppleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={8}
              style={styles.appleLoginButton}
              onPress={handleAppleLogin}
            />
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
    height: 44,
    borderRadius: 8,
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
  // Apple 로그인 버튼 스타일 (Apple 공식 버튼)
  appleLoginButton: {
    width: '100%',
    height: 44,
    marginTop: 12,
  },
});