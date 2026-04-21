// app/(tabs)/mypage/festival-admin-events.tsx - 축제 관리자의 축제 목록
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import * as festivalAdminService from "../../../services/festival-admin.service";
import type { AdminEventResponse } from "../../../services/admin.service";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "공개", color: "#10B981" },
  DRAFT: { label: "초안", color: "#6B7280" },
  ENDED: { label: "종료", color: "#EF4444" },
  INACTIVE: { label: "비공개", color: "#F59E0B" },
};

export default function FestivalAdminEventsScreen() {
  const [events, setEvents] = useState<AdminEventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      setError(null);
      const data = await festivalAdminService.getMyManagedEvents();
      setEvents(data);
    } catch (e: any) {
      setError(e.message || "축제 목록을 불러올 수 없습니다.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [loadEvents])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadEvents();
  }, [loadEvents]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  };

  const renderItem = ({ item }: { item: AdminEventResponse }) => {
    const statusInfo = STATUS_LABELS[item.status || "DRAFT"] || STATUS_LABELS.DRAFT;

    return (
      <Pressable
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: "/(tabs)/mypage/admin-event-edit-detail",
            params: { eventId: item.id, mode: "edit" },
          })
        }
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Text style={styles.statusText}>{statusInfo.label}</Text>
          </View>
        </View>

        <Text style={styles.cardDate}>
          {formatDate(item.startAt)} ~ {formatDate(item.endAt)}
        </Text>

        {item.placeName && (
          <Text style={styles.cardPlace} numberOfLines={1}>
            <Ionicons name="location-outline" size={12} color="#6B7280" /> {item.placeName}
          </Text>
        )}

        <View style={styles.cardFooter}>
          <Pressable
            style={styles.editButton}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/mypage/admin-event-edit-detail",
                params: { eventId: item.id, mode: "edit" },
              })
            }
          >
            <Ionicons name="create-outline" size={16} color="#3B82F6" />
            <Text style={styles.editButtonText}>편집</Text>
          </Pressable>

          <Pressable
            style={styles.statsButton}
            onPress={() =>
              router.push({
                pathname: "/(tabs)/mypage/festival-admin-activity",
                params: { eventId: item.id },
              })
            }
          >
            <Ionicons name="analytics-outline" size={16} color="#10B981" />
            <Text style={styles.statsButtonText}>활동 현황</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={loadEvents}>
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </Pressable>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
        <Text style={styles.emptyText}>관리하는 축제가 없습니다.</Text>
        <Text style={styles.emptySubText}>앱 관리자에게 문의하세요.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={events}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    padding: 20,
  },
  list: {
    padding: 16,
    backgroundColor: "#F3F4F6",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  cardDate: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  cardPlace: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    gap: 12,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 13,
    color: "#3B82F6",
    fontWeight: "500",
  },
  statsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#ECFDF5",
    borderRadius: 6,
  },
  statsButtonText: {
    fontSize: 13,
    color: "#10B981",
    fontWeight: "500",
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    marginTop: 12,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 4,
  },
});
