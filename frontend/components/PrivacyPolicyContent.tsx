/**
 * 개인정보처리방침 문구 로드·렌더링 (설정/회원가입 등에서 공통 사용)
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import * as contentService from '../services/content.service';

export const DEFAULT_PRIVACY_POLICY = `## '다일로(Dailo)' 개인정보처리방침

본 개인정보처리방침은 '다일로(Dailo)' 앱(이하 '서비스')이 사용자의 개인정보를 어떻게 수집, 사용, 보관 및 파기하는지 규정합니다. 본 서비스는 구글 플레이의 개발자 프로그램 정책(특히 사용자 데이터 및 데이터 보안 정책)을 엄격히 준수합니다.

### 1. 수집하는 개인정보 항목 및 수집 목적
서비스는 원활한 기능 제공을 위해 최소한의 정보만 수집합니다.

- 위치 정보 (선택): 사용자의 현재 위치를 기반으로 '내 주변 축제, 공연, 학교 행사' 정보를 맞춤형으로 제공하기 위해 기기의 위치 데이터를 수집합니다. 이 데이터는 행사 목록을 불러오는 즉시 폐기되거나 익명화되며, 백그라운드에서 무단으로 추적하지 않습니다.

- 소셜 로그인 정보 (필수): 구글/카카오/애플 등을 통한 OAuth 2.0 로그인 시, 사용자 식별 및 계정 관리를 위해 '이메일 주소'와 '고유 식별자(UID)'를 수집합니다.

### 2. 개인정보의 보관 및 보호 (보안 정책)

- 모든 API 통신은 HTTPS/TLS 암호화 프로토콜을 통해 안전하게 전송됩니다.
- 수집된 사용자 데이터는 외부 접근이 통제된 안전한 클라우드 데이터베이스(AWS RDS 등)에 암호화되어 보관됩니다.

### 3. 개인정보의 제3자 제공
서비스는 원칙적으로 사용자의 개인정보를 외부나 제3자에게 제공하지 않습니다. 단, 법령에 따른 요구가 있거나 사용자의 사전 동의가 있는 경우는 예외로 합니다.

### 4. 사용자 권리 및 데이터/계정 삭제 요청 (Data Deletion)
사용자는 언제든지 자신의 개인정보 열람, 수정 및 삭제를 요청할 수 있습니다. 특히 구글 플레이 데이터 안전 정책에 따라, 사용자는 앱을 삭제하더라도 아래의 방법을 통해 계정 및 연동된 모든 데이터의 완전한 삭제를 요구할 수 있습니다.

- 앱 내부에서 삭제: [마이페이지/설정] > [계정 탈퇴 및 데이터 삭제] 버튼 클릭

- 웹/이메일을 통한 삭제 요청: 앱에 접속할 수 없는 경우, 아래의 연락처로 '계정 삭제 요청' 이메일을 보내주시면 7일 이내에 DB에서 해당 유저의 식별자 및 관련 데이터를 영구적으로 파기합니다.

### 5. 개인정보 보호책임자 (Contact Information)
사용자의 개인정보를 보호하고 관련 불만을 처리하기 위해 아래와 같이 책임자를 지정하고 있습니다.

- 이름(Developer): Junghwan Yun
- 문의 이메일: yuntyu01

### 6. 부칙
이 개인정보처리방침은 2026년 02월 20일부터 적용됩니다.`;

function renderLine(line: string, index: number): React.ReactNode {
  const t = line.trim();
  if (!t) return <Text key={index} style={styles.paragraph} />;
  if (t.startsWith('### ')) {
    return (
      <Text key={index} style={[styles.sectionSubtitle, { marginTop: 16 }]}>
        {t.slice(4)}
      </Text>
    );
  }
  if (t.startsWith('## ')) {
    return (
      <Text key={index} style={[styles.sectionTitle, { marginTop: index === 0 ? 0 : 24 }]}>
        {t.slice(3)}
      </Text>
    );
  }
  return (
    <Text key={index} style={styles.body}>
      {t}
    </Text>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 6,
  },
  paragraph: { height: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  empty: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 24, marginBottom: 12 },
  retryButton: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#6366F1', borderRadius: 8 },
  retryButtonText: { color: '#FFFFFF', fontWeight: '600' },
  fallbackNotice: { marginTop: 24, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB', alignItems: 'center' },
  fallbackNoticeText: { fontSize: 13, color: '#6B7280', marginBottom: 12, textAlign: 'center' },
});

export type PrivacyPolicyContentProps = {
  onRetry?: () => void;
};

export function PrivacyPolicyContent({ onRetry }: PrivacyPolicyContentProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const text = await contentService.getPrivacyPolicy();
      setContent(text ?? '');
    } catch (e) {
      setContent(DEFAULT_PRIVACY_POLICY);
      setError(e instanceof Error ? e.message : '불러오기 실패');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const lines = content.split(/\n/);

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (!content) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>등록된 개인정보처리방침이 없습니다.</Text>
        <Pressable style={styles.retryButton} onPress={() => { load(); onRetry?.(); }}>
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#6366F1']} />
      }
    >
      {lines.map((line, i) => renderLine(line, i))}
      {error ? (
        <View style={styles.fallbackNotice}>
          <Text style={styles.fallbackNoticeText}>최신 내용을 불러오지 못했습니다. 아래 버튼으로 다시 시도할 수 있습니다.</Text>
          <Pressable style={styles.retryButton} onPress={() => { load(); onRetry?.(); }}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}
