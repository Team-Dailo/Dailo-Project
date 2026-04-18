import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getBusArrivals,
  getBusLocations,
  getBusRouteStops,
  type BusLocation,
  type BusRouteStop,
} from "../../../services/bus.service";

export default function BusRouteScreen() {
  const { routeId, cityCode, routeNo, currentStopId, remainingStops } =
    useLocalSearchParams<{
      routeId: string;
      cityCode: string;
      routeNo: string;
      currentStopId: string;
      remainingStops: string;
    }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);

  const [stops, setStops] = useState<BusRouteStop[]>([]);
  const [buses, setBuses] = useState<BusLocation[]>([]);
  const [liveRemainingStops, setLiveRemainingStops] = useState<number | null>(
    remainingStops !== "" ? parseInt(remainingStops, 10) : null,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
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

  const startCooldown = useCallback(() => {
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setCooldown(30);
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(cooldownRef.current!); cooldownRef.current = null; return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // 정류장 목록은 최초 1회만 로드
  useEffect(() => {
    if (!routeId || !cityCode) return;
    getBusRouteStops(routeId, cityCode)
      .then((data) => {
        setStops(data);
        if (currentStopId) {
          const idx = data.findIndex((s) => s.nodeId === currentStopId);
          if (idx > 0) {
            setTimeout(() => {
              listRef.current?.scrollToIndex({ index: idx, viewOffset: 80, animated: true });
            }, 300);
          }
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [routeId, cityCode]);

  // 버스 위치 + 도착 정보 조회
  const fetchBusLocations = useCallback(async (isRefresh = false) => {
    if (!routeId || !cityCode || !currentStopId) return;
    if (isRefresh && cooldown > 0) return;

    if (isRefresh) {
      setRefreshing(true);
      startSpin();
    }

    try {
      const [locRes, arrivalRes] = await Promise.all([
        getBusLocations(routeId, cityCode).catch(() => null),
        getBusArrivals(currentStopId).catch(() => null),
      ]);
      if (locRes) {
        setBuses(locRes.buses);
        setLastUpdated(new Date(locRes.cachedAt));
      }
      if (arrivalRes) {
        const match = arrivalRes.arrivals.find((a) => a.routeId === routeId);
        if (match) setLiveRemainingStops(match.remainingStops);
      }
      if (isRefresh) startCooldown();
    } catch {
      // 조용히 처리
    } finally {
      setRefreshing(false);
      stopSpin();
    }
  }, [routeId, cityCode, currentStopId, cooldown, startSpin, stopSpin, startCooldown]);

  // 최초 1회 조회
  useEffect(() => {
    fetchBusLocations();
  }, []);

const getBusesAfterStop = (nodeOrder: number): BusLocation[] =>
    buses.filter((b) => b.nodeOrder === nodeOrder);

  const currentStop = stops.find((s) => s.nodeId === currentStopId);
  const busNodeOrder =
    currentStop && liveRemainingStops !== null
      ? currentStop.nodeOrder - liveRemainingStops
      : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <View style={styles.routeBadge}>
            <Text style={styles.routeNo}>{routeNo}</Text>
          </View>
          <Text style={styles.headerSubtitle}>전체 정류장</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* 운행 중 버스 수 + 새로고침 */}
      {lastUpdated && (
        <View style={styles.busCountBar}>
          <Ionicons name="bus" size={13} color="#2563EB" />
          <Text style={styles.busCountText}>
            {buses.length > 0
              ? `운행 중 ${buses.length}대`
              : busNodeOrder !== null
                ? "운행 중"
                : "운행 정보 없음"}
          </Text>
          <View style={styles.refreshArea}>
            {cooldown > 0 && (
              <Text style={styles.cooldownText}>
                {`${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, "0")} 후 다시 시도`}
              </Text>
            )}
            <TouchableOpacity
              onPress={() => fetchBusLocations(true)}
              hitSlop={8}
              disabled={refreshing || cooldown > 0}
            >
              <Animated.View style={{
                transform: [{ rotate: spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }],
              }}>
                <Ionicons
                  name="refresh"
                  size={14}
                  color={refreshing || cooldown > 0 ? "#BFDBFE" : "#93C5FD"}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#3B82F6" size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={36} color="#EF4444" />
          <Text style={styles.errorText}>정류장 정보를 불러오지 못했습니다.</Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={stops}
          keyExtractor={(item, index) => `${item.nodeId}-${index}`}
          contentContainerStyle={styles.listContent}
          onScrollToIndexFailed={() => {}}
          renderItem={({ item, index }) => {
            const isCurrent = item.nodeId === currentStopId;
            const isTerminal = index === 0 || index === stops.length - 1;
            const busesOnLine = getBusesAfterStop(item.nodeOrder);
            const hasBusFromRemaining =
              buses.length === 0 && busNodeOrder !== null && busNodeOrder === item.nodeOrder;
            const hasBusOnLine = busesOnLine.length > 0 || hasBusFromRemaining;

            return (
              <View style={styles.stopRow}>
                <View style={styles.timeline}>
                  <View
                    style={[
                      styles.timelineDot,
                      isTerminal && styles.timelineDotTerminal,
                      isCurrent && styles.timelineDotCurrent,
                    ]}
                  />
                  {index < stops.length - 1 && <View style={styles.timelineLine} />}
                  {index < stops.length - 1 && hasBusOnLine && (
                    <View style={styles.busOnLineWrap}>
                      <View style={styles.busIconCircle}>
                        <Ionicons name="bus" size={11} color="#fff" />
                      </View>
                      {busesOnLine.length > 1 && (
                        <View style={styles.busCountCircle}>
                          <Text style={styles.busCountCircleText}>{busesOnLine.length}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                <View style={[styles.stopInfo, isCurrent && styles.stopInfoCurrent]}>
                  <Text
                    style={[
                      styles.stopName,
                      isTerminal && styles.stopNameTerminal,
                      isCurrent && styles.stopNameCurrent,
                    ]}
                  >
                    {item.nodeName}
                  </Text>
                  {isCurrent ? (
                    <Text style={styles.currentLabel}>현재 정류장</Text>
                  ) : (
                    <Text style={styles.stopOrder}>{item.nodeOrder}번째 정류장</Text>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  backBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  headerTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  routeBadge: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "#EFF6FF", borderRadius: 6 },
  routeNo: { fontSize: 15, fontWeight: "700", color: "#2563EB" },
  headerSubtitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  busCountBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#EFF6FF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#DBEAFE",
  },
  busCountText: { fontSize: 12, fontWeight: "600", color: "#2563EB" },
  refreshArea: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 6 },
  cooldownText: { fontSize: 11, color: "#93C5FD" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  errorText: { fontSize: 14, color: "#EF4444" },
  listContent: { paddingVertical: 16, paddingHorizontal: 20 },
  stopRow: { flexDirection: "row", alignItems: "flex-start", minHeight: 56 },
  timeline: { width: 24, alignItems: "center", marginRight: 12, position: "relative" },
  timelineDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: "#BFDBFE", borderWidth: 2, borderColor: "#93C5FD", marginTop: 4,
  },
  timelineDotTerminal: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  timelineDotCurrent: {
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: "#fff", borderWidth: 3, borderColor: "#EF4444", marginTop: 2,
  },
  timelineLine: { width: 2, flex: 1, backgroundColor: "#BFDBFE", marginTop: 2 },
  stopInfo: { flex: 1, paddingBottom: 16 },
  stopInfoCurrent: {
    backgroundColor: "#FEF2F2", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10,
  },
  stopName: { fontSize: 14, fontWeight: "500", color: "#374151" },
  stopNameTerminal: { fontSize: 15, fontWeight: "700", color: "#111827" },
  stopNameCurrent: { fontSize: 15, fontWeight: "700", color: "#DC2626" },
  stopOrder: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  currentLabel: { fontSize: 11, fontWeight: "600", color: "#EF4444", marginTop: 2 },
  busOnLineWrap: {
    position: "absolute", top: 30, alignSelf: "center",
    alignItems: "center", flexDirection: "row", gap: 2, zIndex: 1,
  },
  busIconCircle: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: "#F59E0B", justifyContent: "center", alignItems: "center",
    borderWidth: 1.5, borderColor: "#fff",
    shadowColor: "#000", shadowOpacity: 0.15, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2, elevation: 2,
  },
  busCountCircle: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: "#EF4444", justifyContent: "center", alignItems: "center",
  },
  busCountCircleText: { fontSize: 9, fontWeight: "700", color: "#fff" },
});
