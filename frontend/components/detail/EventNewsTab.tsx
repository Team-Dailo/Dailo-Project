// frontend/components/detail/EventNewsTab.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { EventNewsItem } from "../../types/event";

interface EventNewsTabProps {
  /** 저장된 소식 목록 (없으면 빈 화면) */
  news?: EventNewsItem[] | null;
}

export default function EventNewsTab({ news }: EventNewsTabProps) {
  const list = news && news.length > 0 ? news : [];

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
          />
        ))
      )}
    </View>
  );
}

interface NewsCardProps {
  title: string;
  body: string;
  date: string;
}

function NewsCard({ title, body, date }: NewsCardProps) {
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
});
