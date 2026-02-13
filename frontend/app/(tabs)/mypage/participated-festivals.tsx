// app/(tabs)/mypage/participated-festivals.tsx
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { getCompletedStaySessions, type StaySessionResponseDto } from "../../../services/location.service";
import {
  formatSessionDate,
  formatSessionTime,
  formatDuration,
} from "../../../utils/staySessionFormat";

export default function ParticipatedFestivalsScreen() {
  const [list, setList] = useState<StaySessionResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<StaySessionResponseDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCompletedStaySessions();
      setList(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right", "bottom"]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle}>참여한 축제</Text>
          <View style={{ width: 22 }} />
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#2563EB" />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.contents}>
            {list.length === 0 ? (
              <Text style={styles.empty}>축제 구역에 참여한 기록이 없습니다.</Text>
            ) : (
              list.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.card}
                  onPress={() => setSelected(item)}
                >
                  <Text style={styles.cardTitle}>{item.eventTitle}</Text>
                  <Text style={styles.cardSub}>
                    {item.placeName || "장소 없음"}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {formatSessionDate(item.startTime)} · 진입 {formatSessionTime(item.startTime)} · 체류 {formatDuration(item.durationMinutes)}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        )}
      </View>

      {/* 상세 모달: 진입시간, 퇴장시간, 체류시간, 날짜 */}
      <Modal
        visible={selected != null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelected(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelected(null)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            {selected != null && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>참여 상세</Text>
                  <TouchableOpacity onPress={() => setSelected(null)} hitSlop={12}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <View style={styles.modalBody}>
                  <Text style={styles.detailLabel}>행사명</Text>
                  <Text style={styles.detailValue}>{selected.eventTitle}</Text>

                  <Text style={styles.detailLabel}>장소</Text>
                  <Text style={styles.detailValue}>{selected.placeName || "-"}</Text>

                  <Text style={styles.detailLabel}>참여일</Text>
                  <Text style={styles.detailValue}>{formatSessionDate(selected.startTime)}</Text>

                  <Text style={styles.detailLabel}>진입 시간</Text>
                  <Text style={styles.detailValue}>{formatSessionTime(selected.startTime)}</Text>

                  <Text style={styles.detailLabel}>퇴장 시간</Text>
                  <Text style={styles.detailValue}>
                    {selected.endTime != null ? formatSessionTime(selected.endTime) : "-"}
                  </Text>

                  <Text style={styles.detailLabel}>체류 시간</Text>
                  <Text style={styles.detailValue}>{formatDuration(selected.durationMinutes)}</Text>
                </View>
                <View style={styles.modalFooter}>
                  <Pressable
                    style={styles.primaryButton}
                    onPress={() => {
                      setSelected(null);
                      router.push(`/event/${selected.eventId}?source=mypage` as import("expo-router").Href);
                    }}
                  >
                    <Text style={styles.primaryButtonText}>행사 상세 보기</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#ffffff" },
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  contents: { padding: 16 },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    color: "#111827",
  },
  cardSub: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: { color: "#DC2626", fontSize: 14 },
  empty: { color: "#6B7280", textAlign: "center", marginTop: 24, fontSize: 14 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBox: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  modalBody: { padding: 20 },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
    marginTop: 12,
    marginBottom: 4,
  },
  detailValue: { fontSize: 15, color: "#111827", marginBottom: 4 },
  modalFooter: { padding: 20, paddingTop: 8 },
  primaryButton: {
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
});
