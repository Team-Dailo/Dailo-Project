// frontend/components/detail/Timeline.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { EventTimelineItem } from "../../types/event";

interface TimelineProps {
  /** 표시할 날짜 라벨 (예: 11.29(목)) */
  dateLabel?: string | null;
  /** 저장된 타임테이블 목록 */
  items?: EventTimelineItem[] | null;
}

function timeToMinutes(t: string): number {
  const s = (t || "").trim();
  const [h, m] = s.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h)) return 0;
  return (h ?? 0) * 60 + (Number.isNaN(m) ? 0 : m);
}

function sortByStartTime<T extends { startTime: string }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

function formatEventDate(iso: string): string {
  try {
    const d = new Date(iso);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    const w = weekdays[d.getDay()];
    return `${m}.${day}(${w})`;
  } catch {
    return "";
  }
}

export default function Timeline({ dateLabel, items }: TimelineProps) {
  const raw = items && items.length > 0 ? items : [];
  const list = sortByStartTime(raw);
  const label = dateLabel && dateLabel.trim() ? dateLabel : null;

  return (
    <View>
      {label ? (
        <View style={styles.dateHeader}>
          <Text style={styles.dateText}>{label}</Text>
        </View>
      ) : null}

      <View style={styles.timelineContent}>
        {list.length === 0 ? (
          <Text style={styles.emptyText}>등록된 타임테이블이 없습니다.</Text>
        ) : (
          list.map((item, index) => (
            <TimelineRow
              key={item.id}
              item={item}
              isLast={index === list.length - 1}
            />
          ))
        )}
      </View>
    </View>
  );
}

interface RowProps {
  item: EventTimelineItem;
  isLast: boolean;
}

function TimelineRow({ item, isLast }: RowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.lineCol}>
        <View style={styles.circle} />
        {!isLast && <View style={styles.line} />}
      </View>
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

export { formatEventDate };

const styles = StyleSheet.create({
  dateHeader: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    paddingVertical: 24,
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
