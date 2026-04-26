// frontend/components/detail/Timeline.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { EventTimelineItem, PerformerItem } from "../../types/event";

interface TimelineProps {
  dateLabel?: string | null;
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

function genreStyle(genre: string): { bg: string; text: string } {
  if (genre.includes("밴드"))   return { bg: "#FFF3E0", text: "#C05E25" };
  if (genre.includes("힙합"))   return { bg: "#F3E5F5", text: "#7B1FA2" };
  if (genre.includes("댄스"))   return { bg: "#E3F2FD", text: "#1565C0" };
  return { bg: "#F3F4F6", text: "#374151" };
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
            <TimelineRow key={item.id} item={item} isLast={index === list.length - 1} />
          ))
        )}
      </View>
    </View>
  );
}

function TimelineRow({ item, isLast }: { item: EventTimelineItem; isLast: boolean }) {
  const timeStr = `${item.startTime}${item.endTime ? ` ~ ${item.endTime}` : ""}`;
  const hasPerformers = !!item.performers?.length;

  return (
    <View style={styles.row}>
      <View style={styles.lineCol}>
        <View style={styles.circle} />
        {!isLast && <View style={styles.line} />}
      </View>

      <View style={styles.cardWrap}>
        <Text style={styles.timeText}>{timeStr}</Text>
        <View style={styles.card}>
          <Text style={styles.titleText}>{item.title}</Text>

          {hasPerformers ? (
            <PerformerList performers={item.performers!} />
          ) : (
            <BulletDetails details={item.details ?? []} />
          )}
        </View>
      </View>
    </View>
  );
}

function PerformerList({ performers }: { performers: PerformerItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <View style={styles.performerList}>
      {performers.map((p, i) => {
        const isOpen = openIndex === i;
        const gs = genreStyle(p.genre);

        return (
          <View key={i}>
            <Pressable
              style={[styles.performerRow, isOpen && styles.performerRowOpen]}
              onPress={() => setOpenIndex(isOpen ? null : i)}
            >
              {/* 순서 번호 */}
              <View style={styles.orderBadge}>
                <Text style={styles.orderText}>{i + 1}</Text>
              </View>

              {/* 이름 */}
              <Text style={styles.performerName}>{p.name}</Text>

              {/* 장르 뱃지 */}
              <View style={[styles.genreBadge, { backgroundColor: gs.bg }]}>
                <Text style={[styles.genreText, { color: gs.text }]}>{p.genre}</Text>
              </View>

              {/* 화살표 */}
              <Ionicons
                name={isOpen ? "chevron-up" : "chevron-down"}
                size={14}
                color="#9CA3AF"
                style={styles.chevron}
              />
            </Pressable>

            {/* 셋리스트 */}
            {isOpen && (
              <View style={[styles.setlistBox, { borderLeftColor: gs.text }]}>
                {p.setlist.map((song, si) => (
                  <View key={si} style={styles.setlistRow}>
                    <Text style={styles.setlistIndex}>{si + 1}</Text>
                    <Text style={styles.setlistSong}>{song}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function BulletDetails({ details }: { details: string[] }) {
  if (details.length === 0) return null;
  return (
    <View style={{ marginTop: 4 }}>
      {details.map((d, i) => (
        <Text key={i} style={styles.detailText}>• {d}</Text>
      ))}
    </View>
  );
}

export { formatEventDate };

const styles = StyleSheet.create({
  dateHeader: { marginBottom: 12, paddingHorizontal: 4 },
  dateText: { fontSize: 16, fontWeight: "bold" },
  emptyText: { fontSize: 14, color: "#9CA3AF", textAlign: "center", paddingVertical: 24 },
  timelineContent: { paddingTop: 4, paddingBottom: 32 },

  row: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16 },
  lineCol: { width: 32, alignItems: "center" },
  circle: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: "#00C853", borderWidth: 2, borderColor: "#e0f2f1",
  },
  line: { width: 2, flex: 1, backgroundColor: "#e0f2f1", marginTop: 2 },

  cardWrap: { flex: 1 },
  timeText: { fontSize: 12, color: "#888", marginBottom: 6 },
  card: {
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
    overflow: "hidden",
  },
  titleText: { fontSize: 14, fontWeight: "bold", marginBottom: 10 },
  detailText: { fontSize: 12, color: "#555", marginBottom: 2 },

  // 공연자 리스트
  performerList: { gap: 2 },
  performerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 8,
  },
  performerRowOpen: {
    backgroundColor: "#F9FAFB",
  },
  orderBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  orderText: { fontSize: 11, fontWeight: "700", color: "#6B7280" },
  performerName: { flex: 1, fontSize: 13, fontWeight: "600", color: "#111827" },
  genreBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  genreText: { fontSize: 11, fontWeight: "600" },
  chevron: { marginLeft: 2 },

  // 셋리스트
  setlistBox: {
    marginLeft: 28,
    marginBottom: 6,
    paddingLeft: 10,
    borderLeftWidth: 2,
    gap: 5,
  },
  setlistRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  setlistIndex: { fontSize: 11, color: "#9CA3AF", fontWeight: "600", minWidth: 14 },
  setlistSong: { fontSize: 12, color: "#374151", flex: 1, lineHeight: 17 },
});
