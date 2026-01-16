// frontend/components/detail/Timeline.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";

type TimelineItem = {
  id: string;
  startTime: string;
  endTime?: string;
  title: string;
  location?: string;
  details?: string[];
};

const MOCK_ITEMS: TimelineItem[] = [
  {
    id: "1",
    startTime: "12:00",
    endTime: "18:00",
    title: "어울림 공연",
    details: ["버스킹", "동아리 공연"],
  },
  {
    id: "2",
    startTime: "12:00",
    endTime: "18:00",
    title: "식스라인 공연",
    details: ["노래 제목 1", "노래 제목 2", "노래 제목 3"],
  },
  {
    id: "3",
    startTime: "18:00",
    endTime: "18:30",
    title: "소리담 공연",
    details: ["공연장"],
  },
  {
    id: "4",
    startTime: "18:00",
    endTime: "18:30",
    title: "신문고 공연",
    details: ["광장", "스테이크"],
  },
];

export default function Timeline() {
  return (
    <View>
      {/* 날짜 선택 헤더 */}
      <View style={styles.dateHeader}>
        <Pressable style={styles.dateArrow}>
          <Text style={styles.dateArrowText}>{"<"}</Text>
        </Pressable>
        <Text style={styles.dateText}>11.29(목)</Text>
        <Pressable style={styles.dateArrow}>
          <Text style={styles.dateArrowText}>{">"}</Text>
        </Pressable>
      </View>

      {/* 타임라인 리스트 */}
      <ScrollView
        style={styles.timelineScroll}
        contentContainerStyle={styles.timelineContent}
        showsVerticalScrollIndicator={false}
      >
        {MOCK_ITEMS.map((item, index) => (
          <TimelineRow
            key={item.id}
            item={item}
            isLast={index === MOCK_ITEMS.length - 1}
          />
        ))}
      </ScrollView>
    </View>
  );
}

interface RowProps {
  item: TimelineItem;
  isLast: boolean;
}

function TimelineRow({ item, isLast }: RowProps) {
  return (
    <View style={styles.row}>
      {/* 왼쪽 세로 라인 + 점 */}
      <View style={styles.lineCol}>
        <View style={styles.circle} />
        {!isLast && <View style={styles.line} />}
      </View>

      {/* 오른쪽 카드 */}
      <View style={styles.card}>
        <Text style={styles.timeText}>
          {item.startTime}
          {item.endTime ? ` ~ ${item.endTime}` : ""}
        </Text>
        <Text style={styles.titleText}>{item.title}</Text>
        {item.details?.map((d) => (
          <Text key={d} style={styles.detailText}>
            • {d}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dateArrow: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dateArrowText: {
    fontSize: 16,
    color: "#777",
  },
  dateText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  timelineScroll: {
    maxHeight: 600, // 필요에 따라 조절
  },
  timelineContent: {
    paddingTop: 4,
    paddingBottom: 32,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  lineCol: {
    width: 32,
    alignItems: "center",
  },
  circle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#00C853", // 초록색 포인트
    borderWidth: 2,
    borderColor: "#e0f2f1",
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: "#e0f2f1",
    marginTop: 2,
  },
  card: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  timeText: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  titleText: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    color: "#555",
  },
});
