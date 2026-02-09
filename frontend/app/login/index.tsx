// app/login/index.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';

export default function LoginScreen() {
  const { login } = useAuth();
  const [name, setName] = useState('여행객');

  const handleLogin = () => {
    login({ name: name.trim() || '여행객' });
    router.back();
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
          <Text style={styles.headerTitle}>로그인</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.body}>
          <Text style={styles.subtitle}>
            지금은 연동 없이 mock으로 동작합니다.
          </Text>
          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>표시 이름</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="로그인 후 보일 이름"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              pressed && styles.loginButtonPressed,
            ]}
            onPress={handleLogin}
          >
            <Text style={styles.loginButtonText}>로그인</Text>
            <Ionicons name="log-in-outline" size={20} color="#FFFFFF" />
          </Pressable>

          <Text style={styles.hint}>
            실제 서비스에서는 이메일/비밀번호 또는 소셜 로그인이 연결됩니다.
          </Text>
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
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2563EB',
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
  hint: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 24,
    lineHeight: 18,
  },
});
