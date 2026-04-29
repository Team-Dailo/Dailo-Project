// app/board/chat/[id].tsx - 채팅화면 (1:1 대화, 백엔드 메시지 히스토리 연동)
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as FileSystem from "expo-file-system/legacy";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as authService from "../../../services/auth.service";
import * as blockService from "../../../services/block.service";
import * as chatService from "../../../services/chat.service";
import { API_BASE_URL } from "../../../constants/api";

type Message = {
  id: string;
  isMe: boolean;
  text: string;
  imageUrl?: string;
  time?: string;
  createdAt?: string;
};

/** 상대 경로를 절대 URL로 변환 */
function normalizeImageUrl(url?: string | null): string | undefined {
  const value = url?.trim();
  if (!value) return undefined;

  // 이미 완전한 URL이거나 로컬/데이터 URI인 경우 그대로 반환
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("file://") ||
    value.startsWith("data:")
  ) {
    return value;
  }

  // API_BASE_URL의 trailing slash 제거
  const baseUrl = API_BASE_URL.replace(/\/$/, "");

  // /uploads/... 형태
  if (value.startsWith("/")) {
    return `${baseUrl}${value}`;
  }

  // uploads/... 형태 (slash 없는 상대 경로)
  return `${baseUrl}/${value}`;
}

function formatDateLabel(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (isSameDay(d, today)) return "오늘";
  if (isSameDay(d, yesterday)) return "어제";
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function formatMessageTime(iso?: string): string {
  try {
    if (!iso) return "";
    let parsedDate: Date;
    // 🔥 타임존 정보 있는 경우 (Z 또는 +09:00 등)
    if (iso.includes("Z") || iso.includes("+")) {

      parsedDate = new Date(iso);

    } 
    // 🔥 타임존 없는 경우 → 서버 시간을 KST(+09:00)로 간주
    else {

      parsedDate = new Date(iso + "+09:00");

    }
    const h = parsedDate.getHours();
    const m = parsedDate.getMinutes();
    const ampm = h < 12 ? "오전" : "오후";
    const h12 = h % 12 || 12;
    return `${ampm} ${h12}:${m.toString().padStart(2, "0")}`;
  } catch {
    return "";

  }

}

/** 실제 비율로 사진 표시 + 탭 시 전체화면 */
function ChatImageBubble({ uri, onPress }: { uri: string; onPress: () => void }) {
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => {
    setLoadFailed(false);
    Image.getSize(uri, (w, h) => setImgSize({ w, h }), () => setLoadFailed(true));
  }, [uri]);
  const MAX_W = 220;
  const displayH = imgSize ? Math.round((imgSize.h / imgSize.w) * MAX_W) : MAX_W;
  if (loadFailed) {
    return (
      <View style={{ width: MAX_W, height: 72, backgroundColor: "#F3F4F6", borderRadius: 12, justifyContent: "center", alignItems: "center" }}>
        <Ionicons name="image-outline" size={24} color="#9CA3AF" />
        <Text style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>이미지를 불러올 수 없습니다</Text>
      </View>
    );
  }
  return (
    <Pressable onPress={onPress} style={{ borderRadius: 12, overflow: "hidden" }}>
      <Image
        source={{ uri }}
        style={{ width: MAX_W, height: displayH, borderRadius: 12 }}
        resizeMode="cover"
        onError={() => setLoadFailed(true)}
      />
    </Pressable>
  );
}

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const roomId = id ? Number(id) : 0;
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollToEnd = useCallback((animated = true) => {
    scrollRef.current?.scrollToEnd({ animated });
  }, []);
  const [input, setInput] = useState("");
  const [room, setRoom] = useState<chatService.ChatRoomResponse | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState<number | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(true);

  const partner = room?.members?.find((m) => m.userId !== myUserId);
  const partnerImageUri = normalizeImageUrl(partner?.profileImageUrl) ?? null;
  const partnerNick = partner
    ? (
        (partner as { nickname?: string; nick_name?: string }).nickname ??
        (partner as { nick_name?: string }).nick_name ??
        ""
      ).trim()
    : "";
  const partnerLeft = !!partner?.leftAt;
  const partnerName = partner
    ? partnerLeft
      ? "알 수 없음"
      : partnerNick || `user_${partner.userId}`
    : "대화 상대";
  const partnerUserId = partner?.userId ?? 0;

  useEffect(() => {
    authService.getStoredUserId().then((uid) => setMyUserId(uid ?? null));
  }, []);

  const fetchRoomAndMessages = useCallback(async () => {
    if (!roomId || !Number.isFinite(roomId)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const uid = await authService.getStoredUserId();
      setMyUserId(uid ?? null);
      const [roomData, msgData, notifStatus] = await Promise.all([
        chatService.getRoom(roomId),
        chatService.getMessages(roomId),
        chatService
          .getNotificationStatus(roomId)
          .catch(() => ({ notificationOn: true })),
      ]);
      setRoom(roomData);
      setNotificationsOn(notifStatus.notificationOn);
      const myId = uid ?? 0;
      // API는 최신순(Desc)이므로 채팅은 과거→최신 순으로 보이도록 뒤집기
      const raw = (msgData.content ?? []).map((m) => {
        const isImage =
          m.messageType?.toUpperCase() === 'IMAGE' ||
          // 구버전 메시지: messageType 무관하게 업로드 이미지 URL이면 이미지로 표시
          (!!m.content &&
            m.content.includes('/uploads/') &&
            /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(m.content) &&
            (m.content.startsWith('http://') || m.content.startsWith('https://')));
        return {
          id: String(m.id),
          isMe: m.senderId === myId,
          text: isImage ? '' : (m.content ?? ""),
          imageUrl: isImage ? normalizeImageUrl(m.content) : undefined,
          time: formatMessageTime(m.createdAt),
          createdAt: m.createdAt,
        };
      });
      setMessages([...raw].reverse());
      await chatService.markRoomAsRead(roomId);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchRoomAndMessages();
  }, [fetchRoomAndMessages]);

  // 메시지 목록 변경 시 맨 아래로 스크롤
  useEffect(() => {
    if (messages.length > 0) {
      const t = setTimeout(() => scrollToEnd(false), 80);
      return () => clearTimeout(t);
    }
  }, [messages, scrollToEnd]);

  // 키보드가 올라올 때 맨 아래로 스크롤
  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", () => scrollToEnd(true));
    return () => sub.remove();
  }, [scrollToEnd]);

  // 앱 재진입·다시 들어올 때마다 서버에서 메시지 다시 로드 (채팅 기록 유지)
  useFocusEffect(
    useCallback(() => {
      if (roomId && Number.isFinite(roomId)) fetchRoomAndMessages();
    }, [roomId, fetchRoomAndMessages]),
  );

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !roomId) return;
    setInput("");
    const optimisticId = `m${Date.now()}`;
    const now = new Date().toISOString();
    setMessages((prev) => [
      ...prev,
      {
        id: optimisticId,
        isMe: true,
        text,
        time: formatMessageTime(now),
        createdAt: now,
      },
    ]);
    try {
      const sent = await chatService.sendMessage(roomId, text);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId
            ? {
                id: String(sent.id),
                isMe: true,
                text: sent.content ?? text,
                time: formatMessageTime(sent.createdAt),
                createdAt: sent.createdAt,
              }
            : m,
        ),
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      Alert.alert("오류", "메시지 전송에 실패했습니다.");
    }
  };

  const [imageUploading, setImageUploading] = useState(false);
  const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);

  const handleSaveImage = async (uri: string) => {
    try {
      // 상대 경로를 절대 URL로 변환
      const fullUri = normalizeImageUrl(uri);
      if (!fullUri) {
        Alert.alert("오류", "저장할 이미지 주소가 없습니다.");
        return;
      }

      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("권한 필요", "사진 저장을 위해 미디어 라이브러리 접근 권한이 필요합니다.");
        return;
      }

      let localUri = fullUri;
      if (fullUri.startsWith("http://") || fullUri.startsWith("https://")) {
        const docDir = FileSystem.documentDirectory;
        if (!docDir) {
          Alert.alert("오류", "파일 저장 경로를 찾을 수 없습니다.");
          return;
        }
        const ext = (fullUri.split(".").pop()?.split("?")[0] ?? "jpg").toLowerCase();
        const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "jpg";
        const dest = `${docDir}chat_${Date.now()}.${safeExt}`;
        const result = await FileSystem.downloadAsync(fullUri, dest);
        localUri = result.uri;
      }
      await MediaLibrary.saveToLibraryAsync(localUri);
      Alert.alert("저장 완료", "사진이 갤러리에 저장되었습니다.");
    } catch (e) {
      console.log("[ChatImage] save failed:", e);
      Alert.alert("오류", "저장에 실패했습니다.");
    }
  };

  const handleSendImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 전송을 위해 갤러리 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const uri = result.assets[0].uri;
    const optimisticId = `img${Date.now()}`;
    const now = new Date().toISOString();
    setMessages((prev) => [
      ...prev,
      { id: optimisticId, isMe: true, text: '', imageUrl: uri, time: formatMessageTime(now), createdAt: now },
    ]);
    setImageUploading(true);
    try {
      const sent = await chatService.sendChatImage(roomId, uri);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId
            ? { id: String(sent.id), isMe: true, text: '', imageUrl: normalizeImageUrl(sent.content) ?? uri, time: formatMessageTime(sent.createdAt), createdAt: sent.createdAt }
            : m,
        ),
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      Alert.alert('오류', '사진 전송에 실패했습니다.');
    } finally {
      setImageUploading(false);
    }
  };

  const handleToggleNotification = async () => {
    setMenuVisible(false);
    if (!roomId) return;
    // 낙관적 업데이트
    setNotificationsOn((prev) => !prev);
    try {
      const result = await chatService.toggleNotification(roomId);
      setNotificationsOn(result.notificationOn);
    } catch {
      // 실패 시 롤백
      setNotificationsOn((prev) => !prev);
      Alert.alert("오류", "알림 설정 변경에 실패했습니다.");
    }
  };

  const handleBlock = () => {
    setMenuVisible(false);
    if (!partnerUserId) return;
    Alert.alert("차단하기", `${partnerName}님을 차단하시겠어요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "차단",
        style: "destructive",
        onPress: async () => {
          try {
            await blockService.blockUser(partnerUserId);
            Alert.alert("차단됨", "사용자를 차단했습니다.");
            router.back();
          } catch {
            Alert.alert("오류", "차단에 실패했습니다.");
          }
        },
      },
    ]);
  };

  const handleLeaveChat = () => {
    setMenuVisible(false);
    Alert.alert("채팅방 나가기", "채팅방을 나가시겠어요?", [
      { text: "취소", style: "cancel" },
      {
        text: "나가기",
        style: "destructive",
        onPress: async () => {
          try {
            await chatService.leaveRoom(roomId);
            router.back();
          } catch {
            Alert.alert("오류", "나가기에 실패했습니다.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#111827" />
          </Pressable>
          {partnerImageUri ? (
            <Image source={{ uri: partnerImageUri }} style={styles.profileCircle} />
          ) : (
            <View style={styles.profileCircle} />
          )}
          <View style={styles.headerCenter}>
            <Text style={styles.partnerName}>{partnerName}님</Text>
          </View>
          <Pressable hitSlop={12} onPress={() => setMenuVisible(true)}>
            <Ionicons name="ellipsis-horizontal" size={22} color="#111827" />
          </Pressable>
        </View>

        {/* 더보기 메뉴 */}
        <Modal
          visible={menuVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuVisible(false)}
        >
          <Pressable
            style={styles.menuBackdrop}
            onPress={() => setMenuVisible(false)}
          >
            <View style={styles.menuCard}>
              <Pressable
                style={styles.menuItem}
                onPress={handleToggleNotification}
              >
                <Ionicons
                  name={notificationsOn ? "notifications" : "notifications-off"}
                  size={20}
                  color="#374151"
                />
                <Text style={styles.menuItemText}>
                  {notificationsOn ? "알림 끄기" : "알림 켜기"}
                </Text>
              </Pressable>
              <Pressable style={styles.menuItem} onPress={handleBlock}>
                <Ionicons name="ban" size={20} color="#374151" />
                <Text style={styles.menuItemText}>차단하기</Text>
              </Pressable>
              <Pressable
                style={[styles.menuItem, styles.menuItemDanger]}
                onPress={handleLeaveChat}
              >
                <Ionicons name="exit-outline" size={20} color="#DC2626" />
                <Text style={styles.menuItemTextDanger}>채팅방 나가기</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        {/* 사진 전체화면 뷰어 - 임시 주석 처리 */}
        {/* <Modal
          visible={!!viewImageUrl}
          transparent={false}
          animationType="fade"
          onRequestClose={() => setViewImageUrl(null)}
          statusBarTranslucent
        >
          <View style={styles.imageViewerBg}>
            <StatusBar hidden />
            <Pressable style={styles.imageViewerClose} onPress={() => setViewImageUrl(null)} hitSlop={12}>
              <Ionicons name="close" size={28} color="#fff" />
            </Pressable>
            <Pressable style={styles.imageViewerSave} onPress={() => viewImageUrl && handleSaveImage(viewImageUrl)} hitSlop={12}>
              <Ionicons name="download-outline" size={28} color="#fff" />
            </Pressable>
            {viewImageUrl && (
              <Image source={{ uri: viewImageUrl }} style={styles.imageViewerImage} resizeMode="contain" />
            )}
          </View>
        </Modal> */}

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollToEnd(false)}
          >
            {messages.map((msg, index) => {
              const isLastOtherInRow =
                !msg.isMe &&
                (index === messages.length - 1 || messages[index + 1].isMe);
              const hasNextOther =
                !msg.isMe &&
                index < messages.length - 1 &&
                !messages[index + 1].isMe;
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const showDateSeparator =
                !prevMsg ||
                formatDateLabel(msg.createdAt) !==
                  formatDateLabel(prevMsg.createdAt);
              return (
                <React.Fragment key={msg.id}>
                  {showDateSeparator && (
                    <View style={styles.dateWrap}>
                      <Text style={styles.dateText}>
                        {formatDateLabel(msg.createdAt)}
                      </Text>
                    </View>
                  )}
                  {msg.isMe ? (
                    <View style={styles.myRow}>
                      <View style={styles.myMeta}>
                        {(!partner?.lastReadAt || (msg.createdAt && msg.createdAt > partner.lastReadAt)) && (
                          <Text style={styles.unreadDot}>1</Text>
                        )}
                        {msg.time ? (
                          <Text style={styles.messageTime}>{msg.time}</Text>
                        ) : null}
                      </View>
                      {/* 이미지 버블 임시 주석 처리 */}
                      {/* {msg.imageUrl ? (
                        <ChatImageBubble uri={msg.imageUrl} onPress={() => setViewImageUrl(msg.imageUrl!)} />
                      ) : ( */}
                        <View style={styles.myBubble}>
                          <Text style={styles.myText}>{msg.imageUrl ? '[이미지]' : msg.text}</Text>
                        </View>
                      {/* )} */}
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.otherRow,
                        hasNextOther && styles.otherRowTight,
                      ]}
                    >
                      {isLastOtherInRow ? (
                        partnerImageUri ? (
                          <Image source={{ uri: partnerImageUri }} style={styles.otherAvatar} />
                        ) : (
                          <View style={styles.otherAvatar} />
                        )
                      ) : (
                        <View style={styles.otherAvatarPlaceholder} />
                      )}
                      {/* 이미지 버블 임시 주석 처리 */}
                      {/* {msg.imageUrl ? (
                        <ChatImageBubble uri={msg.imageUrl} onPress={() => setViewImageUrl(msg.imageUrl!)} />
                      ) : ( */}
                        <View style={styles.otherBubble}>
                          <Text style={styles.otherText}>{msg.imageUrl ? '[이미지]' : msg.text}</Text>
                        </View>
                      {/* )} */}
                      {msg.time ? (
                        <Text style={styles.messageTime}>{msg.time}</Text>
                      ) : null}
                    </View>
                  )}
                </React.Fragment>
              );
            })}
          </ScrollView>
        )}

        {/* 입력 영역 */}
        {partnerLeft ? (
          <View style={[styles.partnerLeftBanner, Platform.OS === 'ios' && { paddingBottom: insets.bottom + 14 }]}>
            <Text style={styles.partnerLeftText}>
              상대방이 채팅방을 나갔습니다.
            </Text>
          </View>
        ) : (
          <View style={[styles.inputRow, Platform.OS === 'ios' && { paddingBottom: insets.bottom + 10 }]}>
            {/* 이미지 전송 버튼 임시 주석 처리
            <Pressable style={styles.inputIcon} onPress={handleSendImage} disabled={imageUploading}>
              {imageUploading
                ? <ActivityIndicator size="small" color="#4C8BF5" />
                : <Ionicons name="image-outline" size={24} color="#4C8BF5" />}
            </Pressable>
            */}
            <TextInput
              style={styles.input}
              placeholder="메시지 보내기.."
              placeholderTextColor="#9CA3AF"
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
            />
            {/* <Pressable style={styles.inputIcon}> 녹음 아이콘 주석 처리
              <Ionicons name="mic-outline" size={22} color="#6B7280" />
            </Pressable> */}
            <Pressable
              onPress={handleSend}
              style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
              disabled={!input.trim()}
            >
              <Ionicons
                name="send"
                size={20}
                color={input.trim() ? "#4C8BF5" : "#9CA3AF"}
              />
            </Pressable>
          </View>
        )}
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 10,
  },
  profileCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
  },
  headerCenter: { flex: 1 },
  partnerName: { fontSize: 16, fontWeight: "600", color: "#111827" },
  dateWrap: { alignItems: "center", paddingVertical: 12 },
  dateText: { fontSize: 12, color: "#9CA3AF" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 16 },
  myRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    marginBottom: 10,
    gap: 6,
  },
  myMeta: {
    alignItems: "flex-end",
    justifyContent: "flex-end",
    gap: 2,
  },
  unreadDot: {
    fontSize: 11,
    color: "#FBBF24",
    fontWeight: "700",
    lineHeight: 14,
  },
  myBubble: {
    maxWidth: "80%",
    backgroundColor: "#4C8BF5",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomRightRadius: 4,
  },
  myText: { fontSize: 15, color: "#FFFFFF", lineHeight: 20 },
  otherRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 10,
    gap: 6,
  },
  otherRowTight: { marginBottom: 4 },
  otherAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F9A8D4",
    marginRight: 8,
  },
  otherAvatarPlaceholder: { width: 32, height: 32, marginRight: 8 },
  otherBubble: {
    maxWidth: "80%",
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomLeftRadius: 4,
  },
  otherText: { fontSize: 15, color: "#111827", lineHeight: 20 },
  messageTime: { fontSize: 11, color: "#9CA3AF", marginBottom: 2 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  inputIcon: { padding: 4, marginBottom: 4 },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    fontSize: 15,
    color: "#111827",
  },
  sendBtn: { padding: 4, marginBottom: 4 },
  sendBtnDisabled: { opacity: 0.6 },
  imageViewerBg: { flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" },
  imageViewerClose: { position: "absolute", top: 52, left: 16, zIndex: 10, padding: 8 },
  imageViewerSave: { position: "absolute", top: 52, right: 16, zIndex: 10, padding: 8 },
  imageViewerImage: { width: "100%", height: "100%" },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 56,
    paddingRight: 12,
  },
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemText: { fontSize: 15, color: "#111827" },
  menuItemDanger: { borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  menuItemTextDanger: { fontSize: 15, color: "#DC2626", fontWeight: "500" },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
  },
  partnerLeftBanner: {
    paddingVertical: 14,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  partnerLeftText: { fontSize: 14, color: "#6B7280" },
});
