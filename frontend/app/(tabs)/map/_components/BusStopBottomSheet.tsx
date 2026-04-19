import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const BUS_STOP_ICON = require("../../../../assets/images/bus-detail-marker.png") as number;
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getBusArrivals,
  getBusRoutesByStop,
  type BusArrivalItem,
  type BusRouteInfo,
  type BusStop,
} from "../../../../services/bus.service";

type MergedItem = {
  routeId: string;
  routeNo: string;
  endNodeName: string; // 종점 (노선 기본 정보)
  destination: string | null; // 도착 정보의 행선지
  arrivalMin: number | null;
  arrivalMessage: string | null;
  remainingStops: number | null;
};

type Props = {
  stop: BusStop | null;
  onClose: () => void;
};

export function BusStopBottomSheet({ stop, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<MergedItem[]>([]);
  const [stopName, setStopName] = useState("");
  const [cityCode, setCityCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = useCallback(() => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setCooldown(30);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const startSpin = useCallback(() => {
    spinAnim.setValue(0);
    spinLoop.current = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    spinLoop.current.start();
  }, [spinAnim]);

  const stopSpin = useCallback(() => {
    spinLoop.current?.stop();
    spinAnim.setValue(0);
  }, [spinAnim]);

  const fetchData = useCallback(
    async (stopId: string, isRefresh = false) => {
      if (isRefresh && cooldown > 0) return;
      if (isRefresh) {
        setRefreshing(true);
        startSpin();
      } else {
        setLoading(true);
        setError(false);
        setItems([]);
      }

      try {
        const [arrivalsRes, routes] = await Promise.all([
          getBusArrivals(stopId).catch(() => null),
          getBusRoutesByStop(stopId).catch(() => [] as BusRouteInfo[]),
        ]);

        if (arrivalsRes) {
          setStopName(arrivalsRes.stopName);
          setCityCode(arrivalsRes.cityCode);
        }

        const arrivals = arrivalsRes?.arrivals ?? [];
        const arrivalMap = new Map<string, BusArrivalItem>();
        for (const a of arrivals) {
          if (a.routeId) arrivalMap.set(a.routeId, a);
        }

        const routeIds = new Set<string>();
        const merged: MergedItem[] = [];

        for (const route of routes) {
          routeIds.add(route.routeId);
          const arrival = arrivalMap.get(route.routeId);
          merged.push({
            routeId: route.routeId,
            routeNo: route.routeNo,
            endNodeName: route.endNodeName,
            destination: arrival?.destination ?? null,
            arrivalMin: arrival?.arrivalMin ?? null,
            arrivalMessage: arrival?.arrivalMessage ?? null,
            remainingStops: arrival?.remainingStops ?? null,
          });
        }

        for (const a of arrivals) {
          if (!a.routeId || routeIds.has(a.routeId)) continue;
          merged.push({
            routeId: a.routeId,
            routeNo: a.routeNo,
            endNodeName: a.destination ?? "",
            destination: a.destination,
            arrivalMin: a.arrivalMin,
            arrivalMessage: a.arrivalMessage,
            remainingStops: a.remainingStops,
          });
        }

        merged.sort((a, b) => {
          const aHas = a.arrivalMin != null ? 0 : 1;
          const bHas = b.arrivalMin != null ? 0 : 1;
          if (aHas !== bHas) return aHas - bHas;
          return (a.arrivalMin ?? 999) - (b.arrivalMin ?? 999);
        });

        setItems(merged);
        setLastUpdated(new Date());
        if (isRefresh) startCooldown();
      } catch {
        if (!isRefresh) setError(true);
      } finally {
        setLoading(false);
        setRefreshing(false);
        stopSpin();
      }
    },
    [startSpin, stopSpin, startCooldown, cooldown],
  );

  useEffect(() => {
    if (!stop) return;
    fetchData(stop.stopId);
  }, [stop?.stopId]);

  if (!stop) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        {/* 핸들 */}
        <View style={styles.handle} />

        {/* 헤더 */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.busIconWrap}>
              <Image source={BUS_STOP_ICON} style={styles.busIconImage} resizeMode="contain" />
            </View>
            <Text style={styles.stopName} numberOfLines={1}>
              {stopName || stop.stopName}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={22} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* 갱신 바 */}
        {!loading && (
          <View style={styles.refreshBar}>
            {cooldown > 0 ? (
              <Text style={styles.refreshTime}>
                {`${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, "0")} 후 다시 시도`}
              </Text>
            ) : (
              lastUpdated && <Text style={styles.refreshTime}>방금 갱신</Text>
            )}
            <TouchableOpacity
              onPress={() => stop && fetchData(stop.stopId, true)}
              hitSlop={8}
              disabled={refreshing || cooldown > 0}
            >
              <Animated.View
                style={{
                  transform: [
                    {
                      rotate: spinAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "360deg"],
                      }),
                    },
                  ],
                }}
              >
                <Ionicons
                  name="refresh"
                  size={15}
                  color={refreshing || cooldown > 0 ? "#D1D5DB" : "#9CA3AF"}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
        )}

        {/* 목록 */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#3B82F6" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>정보를 불러오지 못했습니다.</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>운행중인 버스가 없습니다.</Text>
          </View>
        ) : (
          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {items.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={styles.row}
                onPress={() => {
                  onClose();
                  router.push(
                    `/bus/route/${item.routeId}?cityCode=${cityCode}&routeNo=${item.routeNo}&currentStopId=${stop.stopId}&remainingStops=${item.remainingStops ?? ""}` as any,
                  );
                }}
                activeOpacity={0.7}
              >
                <View style={styles.routeBadge}>
                  <Text style={styles.routeNo} numberOfLines={1}>
                    {item.routeNo}
                  </Text>
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.destination} numberOfLines={1}>
                    {item.destination
                      ? `${item.destination} 방면`
                      : item.endNodeName}
                  </Text>
                  {item.remainingStops != null && (
                    <Text style={styles.remainingStops}>
                      {item.remainingStops}정류장 전
                    </Text>
                  )}
                </View>
                <View style={styles.rowRight}>
                  {item.arrivalMessage ? (
                    <Text
                      style={[
                        styles.arrivalTime,
                        item.arrivalMin != null &&
                          item.arrivalMin <= 5 &&
                          styles.arrivalTimeSoon,
                      ]}
                    >
                      {item.arrivalMessage}
                    </Text>
                  ) : (
                    <Text style={styles.noArrival}>운행 정보 없음</Text>
                  )}
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color="#D1D5DB"
                    style={styles.chevron}
                  />
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "transparent",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 16,
    maxHeight: 420,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: -3 },
    shadowRadius: 8,
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  busIconWrap: {
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  busIconImage: {
    width: 20,
    height: 20,
  },
  stopName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    flex: 1,
  },
  center: {
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  list: {
    maxHeight: 280,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F3F4F6",
  },
  routeBadge: {
    minWidth: 48,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#EFF6FF",
    borderRadius: 6,
    alignItems: "center",
    marginRight: 12,
  },
  routeNo: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  rowInfo: {
    flex: 1,
  },
  destination: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111827",
  },
  remainingStops: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  arrivalTime: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginLeft: 8,
    textAlign: "right",
  },
  arrivalTimeSoon: {
    color: "#EF4444",
  },
  noArrival: {
    fontSize: 12,
    color: "#D1D5DB",
    marginLeft: 8,
  },
  chevron: {
    marginLeft: 2,
  },
  refreshBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    marginBottom: 8,
  },
  refreshTime: {
    fontSize: 11,
    color: "#9CA3AF",
  },
});
