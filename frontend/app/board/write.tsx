// app/board/write.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as boardService from "../../services/board.service";
import { API_BASE_URL } from "../../constants/api";

const CATEGORIES = ["후기", "질문", "자유"] as const;
type Category = (typeof CATEGORIES)[number];

export default function PostWriteScreen() {
  const router = useRouter();
  const [category, setCategory] = useState<Category>("자유");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const show = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hide = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const subShow = Keyboard.addListener(show, (e) => setKeyboardHeight(e.endCoordinates.height));
    const subHide = Keyboard.addListener(hide, () => setKeyboardHeight(0));
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  const handleCancel = () => router.back();
  const handleShare = async () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle || !trimmedContent) {
      Alert.alert("알림", "제목과 내용을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await boardService.createPost({
        title: trimmedTitle,
        content: trimmedContent,
        categoryType: category,
      });
      router.replace(`/board/${created.id}`);
    } catch (e) {
      const isNetworkError =
        e instanceof Error &&
        (e.message?.includes("failed") ||
          e.message?.includes("Network") ||
          e.message?.includes("fetch"));
      const msg = isNetworkError
        ? `서버에 연결할 수 없습니다.\n\n연결 시도 주소: ${API_BASE_URL}\n\n• 백엔드 실행: backend 폴더에서\n  ./gradlew bootRun --args='--spring.profiles.active=local'\n• 에뮬레이터: .env에 http://10.0.2.2:8080\n• 실기기: .env의 EXPO_PUBLIC_API_URL을 PC IP로 (예: http://192.168.0.10:8080)\n• 설정 변경 후 앱 완전 종료 후 다시 실행`
        : "게시물을 등록할 수 없습니다.";
      Alert.alert("게시물 등록 실패", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {/* 헤더: 취소 | 새 게시물 | 공유 */}
        <View style={styles.header}>
          <Pressable onPress={handleCancel} hitSlop={12}>
            <Text style={styles.headerCancel}>취소</Text>
          </Pressable>
          <Text style={styles.headerTitle}>새 게시물</Text>
          <Pressable onPress={handleShare} hitSlop={12} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Text style={styles.headerShare}>공유</Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 카테고리: 후기 / 질문 / 자유 - 게시판 탭과 비슷한 크기, 파란색 */}
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => {
              const selected = category === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                >
                  <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* 제목 - 라벨 없음, 플레이스홀더만 "제목" 크게 */}
          <TextInput
            style={styles.titleInput}
            placeholder="제목을 입력해주세요"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
          />

          {/* 내용 - 라벨 없음 */}
          <TextInput
            style={styles.contentInput}
            placeholder="자유롭게 기록해보세요!"
            placeholderTextColor="#9CA3AF"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>

        {/* 사진/동영상, 태그 - 키보드 없을 땐 하단, 키보드 뜨면 키보드 위에 여유 간격 */}
        <View style={[styles.attachRow, { bottom: keyboardHeight > 0 ? keyboardHeight + 20 : 0 }]}>
          <Pressable style={styles.attachBtn}>
            <Ionicons name="image-outline" size={22} color="#6B7280" />
            <Text style={styles.attachText}>사진/동영상</Text>
          </Pressable>
          <Pressable style={styles.attachBtn}>
            <Text style={styles.hash}>#</Text>
            <Text style={styles.attachText}>태그</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerCancel: { fontSize: 16, color: "#6B7280" },
  headerTitle: { fontSize: 17, fontWeight: "600", color: "#111827" },
  headerShare: { fontSize: 16, fontWeight: "600", color: "#2563EB" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 72 },
  categoryRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  categoryChipSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  categoryChipText: { fontSize: 13, color: "#4B5563", fontWeight: "500" },
  categoryChipTextSelected: { color: "#FFFFFF" },
  titleInput: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  contentInput: {
    minHeight: 160,
    paddingVertical: 12,
    paddingHorizontal: 0,
    fontSize: 15,
    color: "#111827",
    lineHeight: 22,
  },
  attachRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    zIndex: 10,
    elevation: 10,
  },
  attachBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 4 },
  attachText: { fontSize: 14, color: "#6B7280" },
  hash: { fontSize: 16, color: "#6B7280", fontWeight: "600" },
});
