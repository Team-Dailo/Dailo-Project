// 관리자 - 팝업 등록/수정
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as adminService from '../../../services/admin.service';
import { getEventList } from '../../../services/event.service';
import type { Event } from '../../../types/event';

export default function AdminPopupEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');

  // 행사 검색
  const [eventKeyword, setEventKeyword] = useState('');
  const [eventResults, setEventResults] = useState<Event[]>([]);
  const [selectedEventTitle, setSelectedEventTitle] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await adminService.getAdminPopupDetail(parseInt(id, 10));
      setTitle(data.title);
      setImageUrl(data.imageUrl);
      setLinkUrl(data.linkUrl ?? '');
      setDisplayOrder(String(data.displayOrder));
      setStartAt(data.startAt?.slice(0, 10) ?? '');
      setEndAt(data.endAt?.slice(0, 10) ?? '');
      // 기존 링크가 /event/숫자 형태면 행사 연결로 표시
      if (data.linkUrl?.match(/^\/event\/\d+/)) {
        setSelectedEventTitle('(기존 행사 연결됨)');
      }
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '팝업 조회 실패');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (isEdit) loadDetail();
  }, [isEdit, loadDetail]);

  // 행사 검색 (디바운스 300ms)
  useEffect(() => {
    if (!eventKeyword.trim()) {
      setEventResults([]);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await getEventList({ keyword: eventKeyword.trim(), size: 10 });
        setEventResults(results);
      } catch {
        setEventResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [eventKeyword]);

  const handleSelectEvent = (event: Event) => {
    setLinkUrl(`/event/${event.id}`);
    setSelectedEventTitle(event.title);
    setEventKeyword('');
    setEventResults([]);
  };

  const handleClearEvent = () => {
    setLinkUrl('');
    setSelectedEventTitle('');
    setEventKeyword('');
    setEventResults([]);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        const uploadedUrl = await adminService.uploadAdminEventImage(result.assets[0].uri);
        setImageUrl(uploadedUrl);
      } catch (e) {
        Alert.alert('오류', e instanceof Error ? e.message : '이미지 업로드 실패');
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('알림', '제목을 입력해주세요.');
      return;
    }
    if (!imageUrl.trim()) {
      Alert.alert('알림', '이미지를 선택해주세요.');
      return;
    }

    setSaving(true);
    try {
      const body: adminService.PopupCreateRequest = {
        title: title.trim(),
        imageUrl: imageUrl.trim(),
        linkUrl: linkUrl.trim() || null,
        displayOrder: parseInt(displayOrder, 10) || 0,
        startAt: startAt ? `${startAt}T00:00:00` : null,
        endAt: endAt ? `${endAt}T23:59:59` : null,
      };

      if (isEdit) {
        await adminService.updatePopup(parseInt(id!, 10), body);
        Alert.alert('완료', '팝업이 수정되었습니다.', [{ text: '확인', onPress: () => router.back() }]);
      } else {
        await adminService.createPopup(body);
        Alert.alert('완료', '팝업이 등록되었습니다.', [{ text: '확인', onPress: () => router.back() }]);
      }
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>팝업 이미지</Text>
        <Pressable style={styles.imagePicker} onPress={handlePickImage}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.previewImage} resizeMode="cover" />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="image-outline" size={32} color="#9CA3AF" />
              <Text style={styles.placeholderText}>이미지 선택 (비율: 3:4 권장)</Text>
            </View>
          )}
        </Pressable>
        {imageUrl ? (
          <Pressable style={styles.changeImageBtn} onPress={handlePickImage}>
            <Ionicons name="refresh-outline" size={14} color="#6366F1" />
            <Text style={styles.changeImageText}>이미지 변경</Text>
          </Pressable>
        ) : null}

        <Text style={styles.label}>제목</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="팝업 제목"
          placeholderTextColor="#9CA3AF"
        />

        {/* 행사 연결 */}
        <Text style={styles.label}>클릭 시 이동할 행사 (선택)</Text>

        {selectedEventTitle ? (
          <View style={styles.selectedEvent}>
            <Ionicons name="calendar-outline" size={16} color="#6366F1" />
            <Text style={styles.selectedEventTitle} numberOfLines={1}>{selectedEventTitle}</Text>
            <Text style={styles.selectedEventPath} numberOfLines={1}>{linkUrl}</Text>
            <Pressable onPress={handleClearEvent} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </Pressable>
          </View>
        ) : (
          <View style={styles.searchWrapper}>
            <View style={styles.searchInputRow}>
              <Ionicons name="search-outline" size={16} color="#9CA3AF" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={eventKeyword}
                onChangeText={setEventKeyword}
                placeholder="행사명 검색..."
                placeholderTextColor="#9CA3AF"
                returnKeyType="search"
              />
              {searchLoading && <ActivityIndicator size="small" color="#6366F1" style={{ marginRight: 10 }} />}
            </View>

            {eventResults.length > 0 && (
              <FlatList
                data={eventResults}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable style={styles.resultItem} onPress={() => handleSelectEvent(item)}>
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.resultSub} numberOfLines={1}>
                        {item.placeName || item.regionName || ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                  </Pressable>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}

            {eventKeyword.trim().length > 0 && !searchLoading && eventResults.length === 0 && (
              <Text style={styles.noResult}>검색 결과가 없습니다.</Text>
            )}
          </View>
        )}

        <Text style={styles.label}>표시 순서 (낮을수록 먼저)</Text>
        <TextInput
          style={styles.input}
          value={displayOrder}
          onChangeText={setDisplayOrder}
          placeholder="0"
          placeholderTextColor="#9CA3AF"
          keyboardType="number-pad"
        />

        <Text style={styles.label}>시작일 (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={startAt}
          onChangeText={setStartAt}
          placeholder="비워두면 즉시 표시"
          placeholderTextColor="#9CA3AF"
        />

        <Text style={styles.label}>종료일 (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={endAt}
          onChangeText={setEndAt}
          placeholder="비워두면 무기한"
          placeholderTextColor="#9CA3AF"
        />

        <Pressable
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>{isEdit ? '수정' : '등록'}</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  imagePicker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    aspectRatio: 0.75,
  },
  placeholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
  },
  changeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  changeImageText: {
    fontSize: 13,
    color: '#6366F1',
  },
  // 행사 검색
  searchWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 6 },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FAFAFA',
  },
  resultInfo: { flex: 1 },
  resultTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  resultSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 14,
  },
  noResult: {
    padding: 14,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  // 선택된 행사
  selectedEvent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  selectedEventTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#3730A3',
  },
  selectedEventPath: {
    fontSize: 11,
    color: '#6366F1',
    flexShrink: 1,
  },
  saveButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
