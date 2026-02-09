// app/search/index.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import * as logService from '../../services/log.service';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ from?: string }>();
  const fromMap = params.from === 'map';
  const placeholder = fromMap
    ? '지역 축제 / 대학교 행사 / 장소 입력'
    : '글 제목, 내용, 키워드 검색';

  const [keyword, setKeyword] = useState('');
  const [topKeywords, setTopKeywords] = useState<string[]>([]);
  const [topLoading, setTopLoading] = useState(true);

  useEffect(() => {
    logService.getTopSearchKeywords(10).then(setTopKeywords).catch(() => {}).finally(() => setTopLoading(false));
  }, []);

  const handleSubmit = async () => {
    const k = keyword.trim();
    if (!k) return;
    try {
      await logService.logSearch({ keyword: k, resultCount: 0 });
    } catch {
      // ignore
    }
    // TODO: 검색 결과 화면으로 이동 또는 결과 표시
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#9ca3af" />
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#9ca3af"
            value={keyword}
            onChangeText={setKeyword}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            autoFocus
          />
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>인기 검색어</Text>
          {topLoading ? (
            <ActivityIndicator size="small" color="#6366F1" style={{ marginVertical: 8 }} />
          ) : topKeywords.length === 0 ? (
            <Text style={styles.emptyText}>인기 검색어가 없습니다.</Text>
          ) : (
            <View style={styles.chipRow}>
              {topKeywords.map((k) => (
                <Pressable key={k} style={styles.chip} onPress={() => setKeyword(k)}>
                  <Text style={styles.chipText}>{k}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    marginLeft: 6,
    fontSize: 14,
    paddingVertical: 0,
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#9ca3af',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
  },
  chipText: {
    fontSize: 14,
    color: '#374151',
  },
});
