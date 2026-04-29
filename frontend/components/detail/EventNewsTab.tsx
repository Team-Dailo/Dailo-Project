// frontend/components/detail/EventNewsTab.tsx
import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  Image, ScrollView, Modal, TouchableOpacity, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { EventNewsItem } from "../../types/event";
import type { PostListItem } from "../../types/board";
import * as boardService from "../../services/board.service";
import { API_BASE_URL } from "../../constants/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function resolveImageUrl(url: string): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${API_BASE_URL}${url}`;
  return url;
}

interface EventNewsTabProps {
  news?: EventNewsItem[] | null;
  eventId?: number | null;
}

function formatDate(createdAt: string): string {
  try {
    const d = new Date(createdAt);
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return createdAt;
  }
}

export default function EventNewsTab({ news, eventId }: EventNewsTabProps) {
  const router = useRouter();
  const list = news && news.length > 0 ? news : [];

  const [selectedNews, setSelectedNews] = useState<EventNewsItem | null>(null);
  const [reviews, setReviews] = useState<PostListItem[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    if (eventId == null || !Number.isFinite(eventId)) {
      setReviews([]);
      return;
    }
    let cancelled = false;
    setReviewsLoading(true);
    boardService
      .getPostsByEventId(eventId, { page: 0, size: 20 })
      .then((res) => { if (!cancelled) setReviews(res.content ?? []); })
      .catch(() => { if (!cancelled) setReviews([]); })
      .finally(() => { if (!cancelled) setReviewsLoading(false); });
    return () => { cancelled = true; };
  }, [eventId]);

  return (
    <View>
      <Text style={styles.sectionTitle}>최신 소식</Text>
      {list.length === 0 ? (
        <Text style={styles.emptyText}>등록된 소식이 없습니다.</Text>
      ) : (
        list.map((item) => (
          <NewsCard key={item.id} item={item} onPress={() => setSelectedNews(item)} />
        ))
      )}

      {selectedNews && (
        <NewsDetailModal news={selectedNews} onClose={() => setSelectedNews(null)} />
      )}

      {eventId != null && (
        <View style={styles.reviewSection}>
          <Text style={styles.sectionTitle}>후기</Text>
          {reviewsLoading ? (
            <ActivityIndicator size="small" color="#4C8BF5" style={styles.loader} />
          ) : reviews.length === 0 ? (
            <Text style={styles.emptyText}>아직 등록된 후기가 없습니다.</Text>
          ) : (
            reviews.map((post) => (
              <Pressable
                key={post.id}
                style={styles.reviewCard}
                onPress={() => router.push(`/board/${post.id}`)}
              >
                <Text style={styles.reviewTitle}>{post.title}</Text>
                <View style={styles.reviewMeta}>
                  <Text style={styles.reviewAuthor}>{post.authorNickname ?? "알 수 없음"}</Text>
                  <Text style={styles.reviewDate}>{formatDate(post.createdAt)}</Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
      )}
    </View>
  );
}

// --- 카드 (목록용 작은 미리보기) ---

interface NewsCardProps {
  item: EventNewsItem;
  onPress: () => void;
}

function NewsCard({ item, onPress }: NewsCardProps) {
  const { title, body, date, imageUrls } = item;
  const hasImages = Array.isArray(imageUrls) && imageUrls.length > 0;
  const thumb = hasImages ? resolveImageUrl(imageUrls![0]) : null;

  return (
    <Pressable style={styles.newsCard} onPress={onPress}>
      {thumb ? (
        <Image source={{ uri: thumb }} style={styles.newsThumb} resizeMode="cover" />
      ) : (
        <View style={[styles.newsThumb, styles.newsThumbPlaceholder]}>
          <Text style={styles.newsIcon}>🔔</Text>
        </View>
      )}
      <View style={styles.newsTextWrapper}>
        <Text style={styles.newsTitle} numberOfLines={2}>{title}</Text>
        {!!body && <Text style={styles.newsBody} numberOfLines={1}>{body}</Text>}
        <Text style={styles.newsDate}>{date}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
    </Pressable>
  );
}

// --- 핀치줌 이미지 뷰어 ---

function ZoomableImage({ uri }: { uri: string }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, savedScale.value * e.scale);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedX.value + e.translationX;
      translateY.value = savedY.value + e.translationY;
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
      if (scale.value <= 1) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedX.value = 0;
        savedY.value = 0;
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withSpring(1);
      savedScale.value = 1;
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedX.value = 0;
      savedY.value = 0;
    });

  const composed = Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan));

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.Image
        source={{ uri }}
        style={[styles.fullscreenImage, animatedStyle]}
        resizeMode="contain"
      />
    </GestureDetector>
  );
}

// --- 상세 모달 ---

interface NewsDetailModalProps {
  news: EventNewsItem;
  onClose: () => void;
}

function NewsDetailModal({ news, onClose }: NewsDetailModalProps) {
  const { title, body, date, imageUrls } = news;
  const hasImages = Array.isArray(imageUrls) && imageUrls.length > 0;
  const [fullscreenUrl, setFullscreenUrl] = useState<string | null>(null);

  return (
    <>
      <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>소식</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            {hasImages && (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.modalImagesScroll}
              >
                {imageUrls!.map((url, i) => (
                  <TouchableOpacity
                    key={`${url}-${i}`}
                    activeOpacity={0.9}
                    onPress={() => setFullscreenUrl(resolveImageUrl(url))}
                  >
                    <Image
                      source={{ uri: resolveImageUrl(url) }}
                      style={styles.modalImage}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.modalBody}>
              <Text style={styles.modalTitle}>{title}</Text>
              <Text style={styles.modalDate}>{date}</Text>
              {!!body && <Text style={styles.modalBodyText}>{body}</Text>}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {fullscreenUrl && (
        <Modal visible animationType="fade" transparent onRequestClose={() => setFullscreenUrl(null)}>
          <View style={styles.fullscreenBg}>
            <TouchableOpacity
              style={styles.fullscreenClose}
              onPress={() => setFullscreenUrl(null)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <ZoomableImage uri={fullscreenUrl} />
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  // 목록 카드
  newsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f7f7",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  newsThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
  },
  newsThumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e6f0ff",
  },
  newsIcon: {
    fontSize: 26,
  },
  newsTextWrapper: {
    flex: 1,
    gap: 3,
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
  },
  newsBody: {
    fontSize: 12,
    color: "#6B7280",
  },
  newsDate: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  // 모달
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  modalContent: {
    paddingBottom: 40,
  },
  modalImagesScroll: {
    backgroundColor: "#fff",
  },
  modalImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.2,
    backgroundColor: "#fff",
  },
  modalBody: {
    padding: 20,
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  modalDate: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  modalBodyText: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 22,
    marginTop: 4,
  },
  // 공통
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    paddingVertical: 24,
  },
  reviewSection: {
    marginTop: 28,
  },
  loader: {
    paddingVertical: 20,
  },
  reviewCard: {
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  reviewMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewAuthor: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  reviewDate: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  fullscreenBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenClose: {
    position: "absolute",
    top: 52,
    right: 20,
    zIndex: 10,
  },
  fullscreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.5,
  },
});
