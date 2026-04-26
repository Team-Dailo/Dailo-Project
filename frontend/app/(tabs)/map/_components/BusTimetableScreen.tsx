import React, { useState, useMemo, useCallback } from 'react';

import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import timetableData from '../../../../constants/busTimetable.json';

type Waypoint = { label: string; value: string };
type Trip = {
  destination: string;
  routeNo: string;
  from: string;
  time: string;
  waypoints: Waypoint[];
};
type RouteGroup = {
  routeNo: string;
  destinations: string[];
  direction: string;
  trips: Trip[];
};

// 모듈 로드 시 1회만 계산 — 모달을 열고 닫아도 재파싱 없음
const ALL_ROUTE_GROUPS: RouteGroup[] = (() => {
  try {
    const map = new Map<string, RouteGroup>();
    for (const [, sheet] of Object.entries(
      timetableData.timetable as Record<string, { label: string; trips: Trip[] }>
    )) {
      for (const trip of sheet.trips) {
        if (!trip.routeNo) continue;
        if (!map.has(trip.routeNo)) {
          map.set(trip.routeNo, {
            routeNo: trip.routeNo,
            destinations: [],
            direction: sheet.label,
            trips: [],
          });
        }
        const g = map.get(trip.routeNo)!;
        g.trips.push(trip);
        if (trip.destination && !g.destinations.includes(trip.destination))
          g.destinations.push(trip.destination);
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const na = parseInt(a.routeNo.replace(/[^0-9]/g, '')) || 9999;
      const nb = parseInt(b.routeNo.replace(/[^0-9]/g, '')) || 9999;
      return na !== nb ? na - nb : a.routeNo.localeCompare(b.routeNo);
    });
  } catch {
    return [];
  }
})();
type Props = {
  visible: boolean;
  onClose: () => void;
  filterRouteNos?: string[];
  stopName?: string;
};

const CATEGORIES = [
  { key: 'circular', label: '소순환', desc: '01 · 02 · 03 · 04번', color: '#7c3aed' },
  { key: '100',      label: '100번대', desc: '101 ~ 172',           color: '#2563eb' },
  { key: '200',      label: '200번대', desc: '200 ~ 247',           color: '#0891b2' },
  { key: '300',      label: '300번대', desc: '301 ~ 365',           color: '#059669' },
  { key: '400',      label: '400번대', desc: '404 ~ 413',           color: '#d97706' },
  { key: 'special',  label: '특수노선', desc: '555 · 600 · 666 · 777 · 999', color: '#dc2626' },
] as const;
type CategoryKey = typeof CATEGORIES[number]['key'];

function getCategory(routeNo: string): CategoryKey | null {
  const digits = routeNo.replace(/[^0-9]/g, '');
  const n = parseInt(digits);
  if (isNaN(n)) return null;
  if (n <= 4)   return 'circular';
  if (n < 200)  return '100';
  if (n < 300)  return '200';
  if (n < 400)  return '300';
  if (n < 500)  return '400';
  return 'special';
}

function shortLabel(label: string): string {
  if (label.includes('복귀')) return '복귀';
  if (label === '종점도착') return '종점↓';
  if (label === '종점출발') return '종점↑';
  if (label.includes('도착시간') || label.includes('도착지')) return '도착';
  return label.replace('(복귀)', '').replace('방면', '').trim();
}

function splitWaypoints(waypoints: Waypoint[]) {
  if (!waypoints.length) return { mid: [], last: null };
  const last = waypoints[waypoints.length - 1];
  const isFinal =
    last.label.includes('도착시간') ||
    last.label.includes('도착지') ||
    last.label.includes('시간');
  return isFinal
    ? { mid: waypoints.slice(0, -1), last }
    : { mid: waypoints, last: null };
}

export function BusTimetableScreen({ visible, onClose, filterRouteNos, stopName }: Props) {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText]   = useState('');
  const [selectedCat, setSelectedCat] = useState<CategoryKey>('100');
  const [expanded, setExpanded]       = useState<Record<string, boolean>>({});

  const displayGroups = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    let base: RouteGroup[];
    if (filterRouteNos && filterRouteNos.length > 0) {
      const groupMap = new Map(ALL_ROUTE_GROUPS.map((g) => [g.routeNo, g]));
      const unique = [...new Set(filterRouteNos)].sort((a, b) => {
        const na = parseInt(a.replace(/[^0-9]/g, '')) || 9999;
        const nb = parseInt(b.replace(/[^0-9]/g, '')) || 9999;
        return na !== nb ? na - nb : a.localeCompare(b);
      });
      base = unique.map(
        (routeNo) => groupMap.get(routeNo) ?? { routeNo, destinations: [], direction: '', trips: [] }
      );
    } else {
      base = ALL_ROUTE_GROUPS.filter((g) => getCategory(g.routeNo) === selectedCat);
    }
    if (q) {
      return base.filter(
        (g) =>
          g.routeNo.toLowerCase().includes(q) ||
          g.destinations.some((d) => d.toLowerCase().includes(q)) ||
          g.direction.toLowerCase().includes(q)
      );
    }
    return base;
  }, [searchText, selectedCat, filterRouteNos]);

  const toggleRoute = useCallback((routeNo: string) => {
    setExpanded((prev) => ({ ...prev, [routeNo]: !prev[routeNo] }));
  }, []);

  const selectCategory = (key: CategoryKey) => {
    setSelectedCat(key);
    setExpanded({});
  };

  const handleBack = () => {
    setSearchText('');
    setSelectedCat('100');
    onClose();
  };

  const renderTrip = (trip: Trip, i: number) => {
    const { mid, last } = splitWaypoints(trip.waypoints ?? []);
    return (
      <View key={i} style={[styles.tripCard, i % 2 === 1 && styles.tripCardAlt]}>
        <View style={styles.tripRow}>
          <View style={styles.tripTimeBadge}>
            <Text style={styles.tripTimeText}>{trip.time}</Text>
            <Text style={styles.tripFromText}>{trip.from || '차고지'}</Text>
          </View>
          {(mid.length > 0 || last) && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1 }}
              contentContainerStyle={styles.tripFlowContent}
            >
              {mid.map((wp, wi) => (
                <View key={wi} style={styles.tripFlowStep}>
                  <Ionicons name="chevron-forward" size={10} color="#d1d5db" />
                  <View style={styles.waypointChip}>
                    <Text style={styles.waypointChipLabel}>{shortLabel(wp.label)}</Text>
                    <Text style={styles.waypointChipVal}>{wp.value}</Text>
                  </View>
                </View>
              ))}
              {last && (
                <View style={styles.tripFlowStep}>
                  <Ionicons name="chevron-forward" size={10} color="#d1d5db" />
                  <View style={styles.arrivalChip}>
                    <Ionicons name="flag-outline" size={10} color="#fff" />
                    <Text style={styles.arrivalChipText}>{last.value}</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    );
  };

  const renderRoute = useCallback(
    ({ item }: { item: RouteGroup }) => {
      const isExpanded = !!expanded[item.routeNo];
      const hasData = item.trips.length > 0;
      return (
        <View style={styles.routeCard}>
          <TouchableOpacity
            style={styles.routeHeader}
            activeOpacity={hasData ? 0.7 : 1}
            onPress={() => hasData && toggleRoute(item.routeNo)}
          >
            <View style={[styles.routeNoBadge, !hasData && styles.routeNoBadgeGray]}>
              <Text style={styles.routeNoText}>{item.routeNo}</Text>
            </View>
            <View style={styles.routeHeaderMeta}>
              <Text style={styles.routeDestText} numberOfLines={1}>
                {hasData ? item.destinations.join(' · ') : '시간표 정보 없음'}
              </Text>
              {hasData && item.direction ? (
                <Text style={styles.routeDirectionText}>{item.direction}방면</Text>
              ) : null}
            </View>
            {hasData ? (
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#9ca3af"
              />
            ) : (
              <Ionicons name="information-circle-outline" size={16} color="#d1d5db" />
            )}
          </TouchableOpacity>
          {isExpanded && hasData && (
            <View style={styles.tripList}>
              {item.trips.map((trip, i) => renderTrip(trip, i))}
            </View>
          )}
        </View>
      );
    },
    [expanded, toggleRoute]
  );

  const isSearching = searchText.trim().length > 0;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleBack}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {stopName ? `${stopName} 시간표` : '충주 버스 시간표'}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        {/* 카테고리 칩 (정류장 필터 모드에서는 숨김) */}
        {!filterRouteNos && (
          <View style={styles.chipScrollView}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {CATEGORIES.map((cat) => {
                const active = !isSearching && cat.key === selectedCat;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.chip,
                      active && { backgroundColor: cat.color, borderColor: cat.color },
                    ]}
                    onPress={() => selectCategory(cat.key)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, active && { color: '#fff' }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 검색 */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color="#9ca3af" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="노선번호, 방면, 행선지 검색"
            placeholderTextColor="#9ca3af"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* 노선 목록 */}
        <FlatList
          data={displayGroups}
          keyExtractor={(item) => item.routeNo}
          contentContainerStyle={styles.listContent}
          renderItem={renderRoute}
          extraData={expanded}
          ListEmptyComponent={
            <Text style={styles.emptyText}>검색 결과가 없습니다.</Text>
          }
        />

        {/* 안내 */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
          <Text style={styles.footerText}>
            ※ 시간표는 변경될 수 있습니다. 이용 전 충주시 교통 정보를 확인하세요.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', padding: 0 },

  /* 카테고리 칩 */
  chipScrollView: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    height: 50,
    justifyContent: 'center',
  },
  chipRow: {
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  chipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },

  /* 노선 목록 */
  listContent: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#9ca3af', fontSize: 14 },

  routeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 1,
  },
  routeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  routeNoBadge: {
    backgroundColor: '#2563eb',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 46,
    alignItems: 'center',
  },
  routeNoBadgeGray: {
    backgroundColor: '#9ca3af',
  },
  routeNoText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  routeHeaderMeta: { flex: 1 },
  routeDestText: { fontSize: 14, fontWeight: '600', color: '#111827' },
  routeDirectionText: { fontSize: 11, color: '#6b7280', marginTop: 1 },

  tripList: { borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  tripCard: { paddingHorizontal: 12, paddingVertical: 9 },
  tripCardAlt: { backgroundColor: '#f9fafb' },
  tripRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tripTimeBadge: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 64,
    alignItems: 'center',
  },
  tripTimeText: { fontSize: 15, fontWeight: '700', color: '#1e40af' },
  tripFromText: { fontSize: 10, color: '#6b7280', marginTop: 1 },
  tripFlowContent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  tripFlowStep: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  waypointChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    gap: 4,
  },
  waypointChipLabel: { fontSize: 10, color: '#94a3b8' },
  waypointChipVal: { fontSize: 11, fontWeight: '600', color: '#475569' },
  arrivalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    gap: 3,
  },
  arrivalChipText: { fontSize: 11, fontWeight: '600', color: '#fff' },

  footer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  footerText: { fontSize: 11, color: '#9ca3af', textAlign: 'center' },
});
