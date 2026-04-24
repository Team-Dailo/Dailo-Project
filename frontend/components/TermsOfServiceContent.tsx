/**
 * 이용약관(서비스 이용약관) 문구 로드·렌더링
 */
import React from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';

export const TERMS_OF_SERVICE = `## 다일로(Dailo) 서비스 이용약관

### 제1조 (목적)
본 약관은 다일로(Dailo) 앱(이하 "서비스")의 이용 조건 및 절차, 이용자와 서비스 제공자의 권리와 의무를 규정함을 목적으로 합니다.

### 제2조 (서비스 이용)
1. 서비스는 축제, 공연, 학교 행사 정보 제공 및 커뮤니티 기능을 포함합니다.
2. 이용자는 본 약관에 동의함으로써 서비스를 이용할 수 있습니다.

### 제3조 (이용자의 의무)
이용자는 다음 행위를 하여서는 안 됩니다:

1. **욕설 및 비방 금지**
   - 다른 이용자를 모욕하거나 비방하는 내용 게시
   - 욕설, 비속어, 혐오 표현 사용

2. **혐오 콘텐츠 금지**
   - 인종, 성별, 종교, 국적, 장애 등을 이유로 한 차별적 표현
   - 특정 집단에 대한 증오를 조장하는 콘텐츠

3. **불법 콘텐츠 금지**
   - 저작권 침해 자료 게시
   - 음란물, 폭력적 콘텐츠 게시
   - 개인정보 무단 유출
   - 사기, 피싱 등 범죄 관련 콘텐츠

4. **스팸 및 광고 금지**
   - 무분별한 광고성 게시물
   - 동일 내용 반복 게시

5. **기타 금지 행위**
   - 서비스 운영을 방해하는 행위
   - 타인의 계정을 도용하는 행위
   - 허위 정보 유포

### 제4조 (신고 및 차단 기능)
1. 이용자는 부적절한 게시물이나 댓글을 발견할 경우 **신고** 기능을 통해 운영진에게 알릴 수 있습니다.
   - 게시글/댓글의 우측 상단 메뉴(···)에서 "신고" 선택

2. 이용자는 특정 사용자의 콘텐츠를 보고 싶지 않을 경우 **차단** 기능을 사용할 수 있습니다.
   - 해당 사용자 프로필의 우측 상단 메뉴(···)에서 "차단하기" 선택
   - 차단된 사용자의 게시물과 댓글은 표시되지 않습니다.

### 제5조 (제재 조치)
본 약관을 위반한 이용자에 대해 다음과 같은 조치를 취할 수 있습니다:

1. **경고**: 최초 위반 시 경고 조치
2. **게시물 삭제**: 위반 콘텐츠 즉시 삭제
3. **일시 정지**: 반복 위반 시 7일~30일 이용 정지
4. **영구 정지**: 심각한 위반 또는 반복적 위반 시 계정 영구 정지

### 제6조 (면책 조항)
1. 서비스는 이용자가 게시한 콘텐츠에 대해 책임지지 않습니다.
2. 이용자 간 분쟁에 대해 서비스는 중재 의무를 지지 않습니다.

### 제7조 (약관 변경)
1. 서비스는 필요 시 본 약관을 변경할 수 있습니다.
2. 변경된 약관은 앱 내 공지를 통해 안내됩니다.

### 제8조 (문의)
서비스 이용 관련 문의: yuntyu01@gmail.com

### 부칙
본 약관은 2026년 4월 24일부터 시행됩니다.`;

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
  if (t.startsWith('- ')) {
    return (
      <Text key={index} style={styles.listItem}>
        {'  •  '}{t.slice(2)}
      </Text>
    );
  }
  if (/^\d+\.\s/.test(t)) {
    return (
      <Text key={index} style={styles.numberedItem}>
        {t}
      </Text>
    );
  }
  if (t.startsWith('**') && t.endsWith('**')) {
    return (
      <Text key={index} style={styles.boldText}>
        {t.slice(2, -2)}
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
  boldText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    lineHeight: 22,
    marginBottom: 4,
  },
  listItem: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 4,
    paddingLeft: 8,
  },
  numberedItem: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 4,
  },
  paragraph: { height: 8 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
});

export function TermsOfServiceContent() {
  const lines = TERMS_OF_SERVICE.split(/\n/);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      {lines.map((line, i) => renderLine(line, i))}
    </ScrollView>
  );
}
