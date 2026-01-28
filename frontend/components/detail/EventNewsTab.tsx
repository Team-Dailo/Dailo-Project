// frontend/components/detail/EventNewsTab.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface NewsItem {
  id: string;
  title: string;
  body: string;
  date: string;
}

const MOCK_NEWS: NewsItem[] = [
  {
    id: "1",
    title: "공연 시작 시간 안내",
    body: "공연 시작 시간은 19:00 입니다. 앱을 통해 소식을 접하고 빠르게 입장하세요!",
    date: "2025.11.10",
  },
  {
    id: "2",
    title: "우천 시 행사 안내",
    body: "우천시에도 행사는 예정대로 진행되며, 실내 프로그램이 강화될 예정 입니다.",
    date: "2025.11.10",
  },
  {
    id: "3",
    title: "공지 사항 안내",
    body: "축제 사전 예약이 시작되었습니다. 앱을 통해 미리 예약하고 빠르게 입장하세요!",
    date: "2025.11.10",
  },
];

export default function EventNewsTab() {
  return (
    <View>
      <Text style={styles.sectionTitle}>최신 소식</Text>

      {MOCK_NEWS.map((item) => (
        <NewsCard
          key={item.id}
          title={item.title}
          body={item.body}
          date={item.date}
        />
      ))}
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
});
