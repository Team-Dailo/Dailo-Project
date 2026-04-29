// frontend/components/detail/EventNewsTab.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Image, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import type { EventNewsItem } from "../../types/event";
import type { PostListItem } from "../../types/board";
import * as boardService from "../../services/board.service";

interface EventNewsTabProps {
  /** 저장된 소식 목록 (없으면 빈 화면) */
  news?: EventNewsItem[] | null;
  /** 행사 ID - 이 행사에 대한 후기 목록을 소식 아래에 표시 */
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
      .then((res) => {
        if (!cancelled) setReviews(res.content ?? []);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  return (
    <View>
      <Text style={styles.sectionTitle}>최신 소식</Text>
      {list.length === 0 ? (
        <Text style={styles.emptyText}>등록된 소식이 없습니다.</Text>
      ) : (
        list.map((item) => (
          <NewsCard
            key={item.id}
            title={item.title}
            body={item.body}
            date={item.date}
            imageUrls={item.imageUrls}
          />
        ))
      )}

      {/* 행사 후기 (게시판에서 이 행사로 작성한 후기) */}
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

interface NewsCardProps {
  title: string;
  body: string;
  date: string;
  imageUrls?: string[];
}

function NewsCard({ title, body, date, imageUrls }: NewsCardProps) {
  const hasImages = Array.isArray(imageUrls) && imageUrls.length > 0;
  return (
    <View style={styles.newsCard}>
      <View style={styles.newsRow}>
        <View style={styles.newsIconCircle}>
          <Text style={styles.newsIcon}>🔔</Text>
        </View>

        <View style={styles.newsTextWrapper}>
          <Text style={styles.newsTitle}>{title}</Text>
          <Text style={styles.newsBody}>{body}</Text>
        </View>

        <Text style={styles.newsDate}>{date}</Text>
      </View>
      {hasImages && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.newsImagesScroll}
          contentContainerStyle={styles.newsImagesContent}
        >
          {imageUrls!.map((url, i) => (
            <Image
              key={`${url}-${i}`}
              source={{ uri: url }}
              style={styles.newsImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  newsCard: {
    borderRadius: 16,
    backgroundColor: "#f7f7f7",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  newsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  newsIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e6f0ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  newsIcon: {
    fontSize: 18,
  },
  newsTextWrapper: {
    flex: 1,
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  newsBody: {
    fontSize: 13,
    color: "#555",
    lineHeight: 18,
  },
  newsImagesScroll: {
    marginTop: 10,
  },
  newsImagesContent: {
    gap: 8,
    paddingRight: 4,
  },
  newsImage: {
    width: 160,
    height: 160,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    marginRight: 8,
  },
  newsDate: {
    fontSize: 11,
    color: "#aaa",
    marginLeft: 8,
  },
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
});
