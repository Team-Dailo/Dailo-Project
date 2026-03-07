// app/signup/index.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as authService from '../../services/auth.service';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  const handleSendCode = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Alert.alert('입력 오류', '이메일을 먼저 입력해 주세요.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      Alert.alert('입력 오류', '올바른 이메일 형식이 아닙니다.');
      return;
    }
    setSendingCode(true);
    try {
      await authService.sendSignupEmail(trimmedEmail);
      setCodeSent(true);
      Alert.alert(
        '인증번호 발송',
        '입력하신 이메일로 6자리 인증번호를 보냈어요.\n5분 이내에 확인해 주세요.'
      );
    } catch (e) {
      const message =
        e instanceof Error ? e.message : '인증번호를 보내는 데 실패했습니다.';
      Alert.alert('발송 실패', message);
    } finally {
      setSendingCode(false);
    }
  };

  const handleSignup = async () => {
    const trimmedEmail = email.trim();
    const trimmedNickname = nickname.trim();
    if (!trimmedEmail || !password || !trimmedNickname) {
      Alert.alert('입력 오류', '이메일, 비밀번호, 닉네임을 모두 입력해 주세요.');
      return;
    }
    if (!authCode.trim()) {
      Alert.alert('입력 오류', '이메일로 받은 6자리 인증번호를 입력해 주세요.');
      return;
    }
    if (!agreePrivacy) {
      Alert.alert('동의 필요', '개인정보처리방침에 동의해 주세요.');
      return;
    }
    setLoading(true);
    try {
      await authService.signupApi({
        email: trimmedEmail,
        password,
        nickname: trimmedNickname,
        authCode: authCode.trim(),
      });
      await authService.saveNicknameForEmail(trimmedEmail, trimmedNickname);
      Alert.alert('회원가입 완료', '로그인 화면에서 로그인해 주세요.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } catch (e) {
      const message = e instanceof Error ? e.message : '회원가입에 실패했습니다.';
      Alert.alert('회원가입 실패', message, [{ text: '확인' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable hitSlop={12} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle}>회원가입</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>이메일</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="이메일을 입력하세요"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>인증번호</Text>
            <View style={styles.codeRow}>
              <TextInput
                style={[styles.input, styles.codeInput]}
                value={authCode}
                onChangeText={setAuthCode}
                placeholder="6자리 숫자"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={6}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.codeButton,
                  (pressed || sendingCode) && styles.codeButtonPressed,
                ]}
                onPress={handleSendCode}
                disabled={sendingCode}
              >
                {sendingCode ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.codeButtonText}>
                    {codeSent ? '재전송' : '인증번호 받기'}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>비밀번호</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호를 입력하세요"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>닉네임</Text>
            <TextInput
              style={styles.input}
              value={nickname}
              onChangeText={setNickname}
              placeholder="닉네임을 입력하세요"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
            />
          </View>

          <Pressable
            style={styles.agreeRow}
            onPress={() => setAgreePrivacy((v) => !v)}
          >
            <View style={[styles.checkbox, agreePrivacy && styles.checkboxChecked]}>
              {agreePrivacy ? (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              ) : null}
            </View>
            <Text style={styles.agreeLabel}>
              <Text style={styles.agreeLabelPlain}>개인정보처리방침에 동의합니다 </Text>
            </Text>
            <Pressable
              hitSlop={8}
              onPress={() => router.push('/privacy-policy')}
            >
              <Text style={styles.agreeLabelLink}>(보기)</Text>
            </Pressable>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed && styles.submitButtonPressed,
            ]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>회원가입</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={styles.loginLink}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.loginLinkText}>이미 계정이 있으신가요? 로그인</Text>
          </Pressable>
        </ScrollView>
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
  scroll: {
    flex: 1,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 40,
  },
  inputWrap: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
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
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#4C8BF5',
    marginTop: 8,
  },
  submitButtonPressed: {
    opacity: 0.9,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 14,
    color: '#4C8BF5',
    fontWeight: '500',
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4C8BF5',
    borderColor: '#4C8BF5',
  },
  agreeLabel: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  agreeLabelPlain: {},
  agreeLabelLink: {
    color: '#4C8BF5',
    fontWeight: '500',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  codeInput: {
    flex: 1,
  },
  codeButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#4C8BF5',
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeButtonPressed: {
    opacity: 0.9,
  },
  codeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
