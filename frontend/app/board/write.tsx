// app/board/write.tsx
import React, { useState, useEffect, useCallback } from "react";
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
  Modal,
  FlatList,
  Image,
  Linking,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as boardService from "../../services/board.service";
import * as authService from "../../services/auth.service";
import * as eventService from "../../services/event.service";
import { useMyUserId } from "../../hooks/useAuth";
import { API_BASE_URL } from "../../constants/api";
import type { Event } from "../../types/event";

const CATEGORIES = ["후기", "질문", "자유"] as const;
type Category = (typeof CATEGORIES)[number];

const MAX_IMAGES = 4;
const IMAGE_GAP = 6;
const PREVIEW_SIZE = 72;

export default function PostWriteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ edit?: string }>();
  const editId = params.edit ? String(params.edit).trim() : undefined;
  const userId = useMyUserId();

  const [category, setCategory] = useState<Category>("자유");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  /** 후기 카테고리일 때 선택한 행사 */
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedEventTitle, setSelectedEventTitle] = useState<string>("");
  const [eventPickerVisible, setEventPickerVisible] = useState(false);
  const [eventList, setEventList] = useState<Event[]>([]);
  const [eventListLoading, setEventListLoading] = useState(false);
  /** 선택한 사진 URI 목록 (동영상 불가, 사진만) */
  const [selectedImageUris, setSelectedImageUris] = useState<string[]>([]);
  /** 수정 시 기존 게시글에 있던 이미지 URL (서버에 이미 저장됨) */
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);

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

  useEffect(() => {
    if (!editId) {
      setLoadingEdit(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const post = await boardService.getPostById(editId);
        if (!cancelled) {
          setTitle(post.title ?? "");
          setContent(post.content ?? "");
          const cat = (post.categoryType ?? "자유") as Category;
          setCategory(CATEGORIES.includes(cat) ? cat : "자유");
          if (post.eventId != null) {
            setSelectedEventId(post.eventId);
            setSelectedEventTitle(""); // 제목은 선택 모달에서만 표시
          }
          const urls = post.imageUrls ?? (post as Record<string, unknown>).image_urls as string[] | undefined;
          setExistingImageUrls(Array.isArray(urls) ? urls : []);
        }
      } catch {
        if (!cancelled) Alert.alert("오류", "게시물을 불러올 수 없습니다.");
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    })();
    return () => { cancelled = true; };
  }, [editId]);

  const handleCancel = () => router.back();

  const openImagePicker = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "권한 필요",
          "사진을 선택하려면 갤러리 접근 권한이 필요합니다.",
          [{ text: "확인" }, { text: "설정으로 이동", onPress: () => Linking.openSettings() }]
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length) {
        const uris = result.assets.map((a) => a.uri);
        const currentTotal = existingImageUrls.length + selectedImageUris.length;
        const spaceLeft = MAX_IMAGES - currentTotal;
        if (spaceLeft <= 0) return;
        setSelectedImageUris((prev) => {
          const next = [...prev, ...uris];
          const maxNew = MAX_IMAGES - existingImageUrls.length;
          return next.slice(0, maxNew);
        });
      }
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "사진을 불러올 수 없습니다.");
    }
  }, [existingImageUrls.length]);

  const removeImage = useCallback((uri: string) => {
    if (uri.startsWith("http")) {
      setExistingImageUrls((prev) => prev.filter((u) => u !== uri));
    } else {
      setSelectedImageUris((prev) => prev.filter((u) => u !== uri));
    }
  }, []);

  const submitPostBody = useCallback(
    async (
      trimmedTitle: string,
      trimmedContent: string,
      category: Category,
      eventId: number | null | undefined,
      imageUrls: string[],
      authorIdOrUndefined: number | undefined,
      editIdParam: string | undefined,
      nav: ReturnType<typeof useRouter>
    ) => {
      const body = {
        title: trimmedTitle,
        content: trimmedContent,
        categoryType: category,
        eventId: eventId ?? undefined,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      };
      if (editIdParam) {
        await boardService.updatePost(editIdParam, body, authorIdOrUndefined);
        nav.replace(`/board/${editIdParam}`);
      } else {
        const created = await boardService.createPost(body, authorIdOrUndefined);
        nav.replace(`/board/${created.id}`);
      }
    },
    []
  );

  const openEventPicker = useCallback(async () => {
    setEventPickerVisible(true);
    setEventListLoading(true);
    try {
      const list = await eventService.getEventList({ page: 1, size: 100 });
      setEventList(list ?? []);
      const found = (list ?? []).find((e) => e.id === selectedEventId);
      if (found) setSelectedEventTitle(found.title ?? "");
    } catch {
      setEventList([]);
    } finally {
      setEventListLoading(false);
    }
  }, [selectedEventId]);

  const handleShare = async () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle || !trimmedContent) {
      Alert.alert("알림", "제목과 내용을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const me = await authService.getMe();
      let authorId: number | null =
        me?.id != null && me.id > 0 ? me.id : (await authService.getStoredUserId()) ?? (userId ?? null);
      const hasToken = !!(await authService.getAccessToken());
      if ((authorId == null || authorId <= 0) && !hasToken) {
        Alert.alert("로그인 필요", "글을 쓰려면 로그인해 주세요.");
        setSubmitting(false);
        return;
      }
      const authorIdOrUndefined = authorId != null && authorId > 0 ? authorId : undefined;
      const eventId = category === "후기" ? selectedEventId ?? undefined : undefined;

      let imageUrls: string[] = [...existingImageUrls];
      if (selectedImageUris.length > 0) {
        try {
          for (const uri of selectedImageUris) {
            const url = await boardService.uploadPostImage(uri);
            imageUrls.push(url);
          }
        } catch (uploadErr) {
          const uploadMsg = uploadErr instanceof Error ? uploadErr.message : "사진 업로드 실패";
          const isAuth = uploadMsg.includes("로그인") || uploadMsg.includes("401") || uploadMsg.includes("403");
          Alert.alert(
            "사진 업로드 실패",
            isAuth
              ? "로그인이 만료되었을 수 있습니다. 로그아웃 후 다시 로그인해 주세요."
              : `${uploadMsg}\n\n사진 없이 게시물만 등록할까요?`,
            [
              { text: "취소", style: "cancel" },
              {
                text: "사진 없이 등록",
                onPress: async () => {
                  setSubmitting(true);
                  try {
                    await submitPostBody(trimmedTitle, trimmedContent, category, eventId, imageUrls, authorIdOrUndefined, editId, router);
                  } catch (e2) {
                    const m = e2 instanceof Error ? e2.message : "등록 실패";
                    Alert.alert("게시물 등록 실패", m);
                  } finally {
                    setSubmitting(false);
                  }
                },
              },
            ]
          );
          setSubmitting(false);
          return;
        }
      }

      await submitPostBody(trimmedTitle, trimmedContent, category, eventId, imageUrls, authorIdOrUndefined, editId, router);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isNetworkError = msg.includes("failed") || msg.includes("Network") || msg.includes("fetch");
      const displayMsg = isNetworkError
        ? `서버에 연결할 수 없습니다.\n\n연결 주소: ${API_BASE_URL}\n\n네트워크와 로그인 상태를 확인해 주세요.`
        : msg || (editId ? "게시물 수정에 실패했습니다." : "게시물을 등록할 수 없습니다.");
      Alert.alert(editId ? "수정 실패" : "게시물 등록 실패", displayMsg);
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
          <Text style={styles.headerTitle}>{editId ? "게시물 수정" : "새 게시물"}</Text>
          <Pressable onPress={handleShare} hitSlop={12} disabled={submitting || loadingEdit}>
            {submitting || loadingEdit ? (
              <ActivityIndicator size="small" color="#4C8BF5" />
            ) : (
              <Text style={styles.headerShare}>{editId ? "저장" : "공유"}</Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            keyboardHeight > 0 && { paddingBottom: keyboardHeight + 120 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          {/* 카테고리: 후기 / 질문 / 자유 - 게시판 탭과 비슷한 크기, 파란색 */}
          <View style={styles.categoryRow}>
            {CATEGORIES.map((cat) => {
              const selected = category === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => {
                    setCategory(cat);
                    if (cat !== "후기") {
                      setSelectedEventId(null);
                      setSelectedEventTitle("");
                    }
                  }}
                  style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                >
                  <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* 후기일 때: 어떤 행사에 대한 후기인지 선택 */}
          {category === "후기" && (
            <View style={styles.eventSelectRow}>
              <Text style={styles.eventSelectLabel}>어떤 행사에 대한 후기인가요?</Text>
              <Pressable style={styles.eventSelectBtn} onPress={openEventPicker}>
                <Text style={styles.eventSelectBtnText} numberOfLines={1}>
                  {selectedEventId != null && selectedEventTitle
                    ? selectedEventTitle
                    : selectedEventId != null
                      ? `행사 #${selectedEventId}`
                      : "행사 선택하기"}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#6B7280" />
              </Pressable>
            </View>
          )}

          {/* 제목 - 라벨 없음, 플레이스홀더만 "제목" 크게 */}
          <TextInput
            style={styles.titleInput}
            placeholder="제목을 입력해주세요"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
          />

          {/* 선택한 사진 미리보기 (작은 정사각형, 최대 4장, 스크롤 가능) */}
          {(selectedImageUris.length > 0 || existingImageUrls.length > 0) && (
            <View style={[styles.imagePreviewRow, { marginBottom: 16 }]}>
              {existingImageUrls.map((uri) => (
                <View
                  key={uri}
                  style={[
                    styles.imagePreviewWrap,
                    {
                      width: PREVIEW_SIZE,
                      height: PREVIEW_SIZE,
                      marginRight: IMAGE_GAP,
                      marginBottom: IMAGE_GAP,
                    },
                  ]}
                >
                  <Image
                    source={{ uri }}
                    style={styles.imagePreviewSquare}
                    resizeMode="cover"
                  />
                  <Pressable
                    style={styles.imagePreviewRemove}
                    onPress={() => removeImage(uri)}
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle" size={24} color="#374151" />
                  </Pressable>
                </View>
              ))}
              {selectedImageUris.map((uri) => (
                <View
                  key={uri}
                  style={[
                    styles.imagePreviewWrap,
                    {
                      width: PREVIEW_SIZE,
                      height: PREVIEW_SIZE,
                      marginRight: IMAGE_GAP,
                      marginBottom: IMAGE_GAP,
                    },
                  ]}
                >
                  <Image
                    source={{ uri }}
                    style={styles.imagePreviewSquare}
                    resizeMode="cover"
                  />
                  <Pressable
                    style={styles.imagePreviewRemove}
                    onPress={() => removeImage(uri)}
                    hitSlop={8}
                  >
                    <Ionicons name="close-circle" size={24} color="#374151" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* 내용 - 사진 아래에서부터 작성 */}
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

        {/* 행사 선택 모달 */}
        <Modal
          visible={eventPickerVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setEventPickerVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setEventPickerVisible(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>행사 선택</Text>
                <Pressable onPress={() => setEventPickerVisible(false)} hitSlop={12}>
                  <Text style={styles.modalClose}>닫기</Text>
                </Pressable>
              </View>
              {eventListLoading ? (
                <ActivityIndicator size="small" color="#4C8BF5" style={styles.modalLoader} />
              ) : (
                <FlatList
                  data={eventList}
                  keyExtractor={(item) => String(item.id)}
                  style={styles.modalList}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.modalItem}
                      onPress={() => {
                        setSelectedEventId(item.id);
                        setSelectedEventTitle(item.title ?? "");
                        setEventPickerVisible(false);
                      }}
                    >
                      <Text style={styles.modalItemTitle} numberOfLines={1}>{item.title}</Text>
                      {item.placeName ? (
                        <Text style={styles.modalItemSub} numberOfLines={1}>{item.placeName}</Text>
                      ) : null}
                    </Pressable>
                  )}
                  ListEmptyComponent={<Text style={styles.emptyList}>행사 목록이 없습니다.</Text>}
                />
              )}
            </Pressable>
          </Pressable>
        </Modal>

        {/* 사진 - 키보드 없을 땐 하단, 키보드 뜨면 키보드 위에 여유 간격 */}
        <View style={[styles.attachRow, { bottom: keyboardHeight > 0 ? keyboardHeight + 20 : 0 }]}>
          <Pressable
            style={styles.attachBtn}
            onPress={openImagePicker}
            disabled={existingImageUrls.length + selectedImageUris.length >= MAX_IMAGES}
          >
            <Ionicons
              name="image-outline"
              size={22}
              color={existingImageUrls.length + selectedImageUris.length >= MAX_IMAGES ? "#D1D5DB" : "#6B7280"}
            />
            <Text
              style={[
                styles.attachText,
                existingImageUrls.length + selectedImageUris.length >= MAX_IMAGES && styles.attachTextDisabled,
              ]}
            >
              사진 {(existingImageUrls.length + selectedImageUris.length) > 0 ? `(${existingImageUrls.length + selectedImageUris.length}/${MAX_IMAGES})` : ""}
            </Text>
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
  headerTitle: { fontSize: 17, fontWeight: "600", color: "#111827", marginLeft: 20 },
  headerShare: { fontSize: 16, fontWeight: "600", color: "#4C8BF5" },
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
    backgroundColor: "#4C8BF5",
    borderColor: "#4C8BF5",
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
  imagePreviewRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
  },
  imagePreviewWrap: {
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
  },
  imagePreviewSquare: {
    width: "100%",
    height: "100%",
  },
  imagePreviewRemove: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 14,
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
  attachTextDisabled: { color: "#D1D5DB" },
  eventSelectRow: { marginBottom: 16 },
  eventSelectLabel: { fontSize: 13, color: "#6B7280", marginBottom: 8 },
  eventSelectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
  },
  eventSelectBtnText: { fontSize: 15, color: "#111827", flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: { fontSize: 17, fontWeight: "600", color: "#111827" },
  modalClose: { fontSize: 16, color: "#4C8BF5" },
  modalLoader: { paddingVertical: 24 },
  modalList: { maxHeight: 360 },
  modalItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalItemTitle: { fontSize: 15, fontWeight: "500", color: "#111827" },
  modalItemSub: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  emptyList: { textAlign: "center", paddingVertical: 24, color: "#9CA3AF" },
});
