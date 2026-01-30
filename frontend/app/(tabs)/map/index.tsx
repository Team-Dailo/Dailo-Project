// app/(tabs)/map/index.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutChangeEvent,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useMap } from '../../../hooks/useMap';
import { FilterChips } from './_components/FilterChips';
import { MapBottomSheet } from './_components/MapBottomSheet';
import { SideMenu } from './_components/SideMenu';
import {
  DateFilterModal,
  CategoryFilterModal,
  PopularFilterModal,
  RegionFilterModal,
  ScaleFilterModal,
} from './_components/FilterModals';

type SheetMode = 'collapsed' | 'expanded';

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<
    'date' | 'category' | 'popular' | 'region' | 'scale' | null
  >(null);

  const [sheetMode, setSheetMode] = useState<SheetMode>('collapsed');
  const [filterBottomY, setFilterBottomY] = useState(0);

  // 축제 참여 배너
  const [isFestivalActive, setIsFestivalActive] = useState(false);
  const [festivalChipHeight, setFestivalChipHeight] = useState(0);

  // 범례(규모 설명)
  const [isScaleLegendVisible, setIsScaleLegendVisible] = useState(false);
  const [mapHeight, setMapHeight] = useState(0);
  const [legendHeight, setLegendHeight] = useState(0);

  // 전체화면 진입 모달 (기존)
  const [isEntryModalVisible, setIsEntryModalVisible] = useState(false);

  const {
    events,
    selectedEvent,
    isBottomSheetOpen,
    handleMarkerPress,
    closeBottomSheet,
    focusCurrentLocation,
  } = useMap();

  const onPressBookmarkList = () => {
    router.push('/(tabs)/mypage/saved-festivals');
  };

  const handlePressActiveFestivalFromMenu = () => {
    setIsMenuOpen(false);
    setIsFestivalActive(true);
    setIsEntryModalVisible(true);
  };

  const onPressFestivalList = () => {
    if (!events || events.length === 0) return;
    handleMarkerPress(events[0]);
    setSheetMode('collapsed');
  };

  // ✅ 위치 값들 (mapContainer 기준)
  const BUTTON_SIZE = 56;
  const overlayTopBase = 12;

  // 참여칩이 있을 때 규모 버튼이 아래로 내려가야 함
  const chipPush = isFestivalActive ? (festivalChipHeight || 60) + 10 : 0;

  const scaleTopRaw = overlayTopBase + chipPush;
  const scaleTop = Math.max(scaleTopRaw, 8);
  const scaleLeft = 16;

  const bookmarkTop = overlayTopBase;
  const bookmarkRight = 16;

  // ✅ 범례 카드: 규모 버튼 오른쪽에 딱 붙이기
  const legendLeft = scaleLeft + BUTTON_SIZE + 8;

  // top clamp: 최소 8, 최대 mapHeight - legendHeight - 8
  const legendTop = (() => {
    const minTop = 8;
    const maxTop = Math.max(8, mapHeight - legendHeight - 8);

    // 🔥 범례가 카테고리 칩 영역 침범하면 안 되므로 "scaleTop" 근처에서만 뜨게
    // (윤아님이 +98 넣으셔서 아래로 내려간 상태였는데, 옆으로 딱 붙게 하려면 scaleTop 그대로가 자연스러워요)
    const t = scaleTop + 98;

    return Math.min(Math.max(t, minTop), maxTop);
  })();

  const legendItems = useMemo(
    () => [
      { color: '#FF5A5A', label: '시·군·구' },
      { color: '#FF8A00', label: '대학교' },
      { color: '#FFC107', label: '단과대/학생회' },
      { color: '#00C853', label: '동아리/소모임' },
      { color: '#2979FF', label: '개인' },
      { color: '#8E24AA', label: '기타' },
    ],
    []
  );

  return (
    <View style={styles.container}>
      {/* 상단: 햄버거 + 검색창 */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setIsMenuOpen(true)}
        >
          <Ionicons name="menu" size={22} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.searchBox}
          activeOpacity={0.8}
          onPress={() => router.push('../search')}
        >
          <Ionicons name="search" size={18} color="#9ca3af" />
          <Text style={styles.searchPlaceholder}>
            지역 축제 / 대학교 행사 / 장소 입력
          </Text>
        </TouchableOpacity>
      </View>

      {/* 필터 칩들 */}
      <View
        onLayout={(e: LayoutChangeEvent) => {
          const { y, height } = e.nativeEvent.layout;
          setFilterBottomY(y + height);
        }}
      >
        <FilterChips
          onPressDate={() => setActiveFilter('date')}
          onPressCategory={() => setActiveFilter('category')}
          onPressPopular={() => setActiveFilter('popular')}
          onPressRegion={() => setActiveFilter('region')}
          onPressScale={() => setActiveFilter('scale')}
        />
      </View>

      {/* 지도 영역 */}
      <View
        style={styles.mapContainer}
        onLayout={(e) => setMapHeight(e.nativeEvent.layout.height)}
      >
        {/* 임시 지도 */}
        <View style={styles.fakeMap}>
          <Text style={styles.fakeMapText}>(임시) 여기 지도 들어갈 자리입니다.</Text>
        </View>

        {/* ✅ 지도 위 UI 레이어(여기 안에 버튼/칩 넣어야 JSX가 안 깨짐) */}
        <View
          pointerEvents="box-none"
          style={[
            styles.mapOverlayLayer,
            { zIndex: isBottomSheetOpen ? 0 : 10 },
          ]}
        >
          {/* 축제 참여 배너(사진처럼) */}
          {isFestivalActive && (
            <View
              style={styles.activeChip}
              onLayout={(e) => setFestivalChipHeight(e.nativeEvent.layout.height)}
            >
              <View style={styles.activeChipLeft}>
                <View style={styles.activeChipEmojiCircle}>
                  <Text style={styles.activeChipEmoji}>🎉</Text>
                </View>

                <View style={styles.activeChipTextCol}>
                  <Text style={styles.activeChipLabel}>축제 참여 중</Text>
                  <Text style={styles.activeChipTimer}>00:17:37</Text>
                </View>
              </View>
            </View>
          )}

          {/* 규모 버튼 */}
          <TouchableOpacity
            style={[
              styles.squareButton,
              {
                width: BUTTON_SIZE,
                height: BUTTON_SIZE,
                borderRadius: 14,
                left: scaleLeft,
                top: scaleTop,
              },
            ]}
            activeOpacity={0.85}
            onPress={() => setIsScaleLegendVisible((v) => !v)}
          >
            <View style={styles.scaleIcon} />
            <Text style={styles.squareButtonText}>규모</Text>
          </TouchableOpacity>

          {/* 북마크 버튼 */}
          <TouchableOpacity
            style={[
              styles.squareButton,
              {
                width: BUTTON_SIZE,
                height: BUTTON_SIZE,
                borderRadius: 14,
                right: bookmarkRight,
                top: bookmarkTop,
              },
            ]}
            activeOpacity={0.85}
            onPress={onPressBookmarkList}
          >
            <Ionicons name="bookmark" size={18} color="#2563EB" />
            <Text style={styles.squareButtonText}>북마크</Text>
          </TouchableOpacity>
        </View>

        {/* ✅ 규모 범례: 딤 없이, 규모 버튼 오른쪽에 고정 */}
        <Modal
          visible={isScaleLegendVisible}
          transparent
          animationType="none"
          onRequestClose={() => setIsScaleLegendVisible(false)}
        >
          <Pressable
            style={styles.legendOverlayTransparent}
            onPress={() => setIsScaleLegendVisible(false)}
          >
            {/* 카드 자체는 클릭해도 닫히지 않게 */}
            <Pressable
              style={[
                styles.legendCard,
                {
                  left: legendLeft,
                  top: legendTop,
                },
              ]}
              onLayout={(e) => setLegendHeight(e.nativeEvent.layout.height)}
              onPress={() => {}}
            >
              {legendItems.map((it) => (
                <View key={it.label} style={styles.legendRow}>
                  <View
                    style={[styles.legendDot, { backgroundColor: it.color }]}
                  />
                  <Text style={styles.legendLabel}>{it.label}</Text>
                </View>
              ))}
            </Pressable>
          </Pressable>
        </Modal>

        {/* ✅ 현재 위치 버튼 */}
        <TouchableOpacity
          style={styles.currentLocationFab}
          activeOpacity={0.85}
          onPress={focusCurrentLocation}
        >
          <Ionicons name="locate" size={18} color="#2563EB" />
        </TouchableOpacity>

        {/* 하단 축제 목록 보기 */}
        {!isBottomSheetOpen && (
          <View style={styles.listButtonWrapper}>
            <TouchableOpacity
              style={styles.listButton}
              activeOpacity={0.85}
              onPress={onPressFestivalList}
            >
              <Text style={styles.listButtonText}>축제 목록 보기</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 바텀시트 */}
      <MapBottomSheet
        visible={isBottomSheetOpen}
        event={selectedEvent}
        mode={sheetMode}
        filterBottomY={filterBottomY}
        onClose={() => {
          setSheetMode('collapsed');
          closeBottomSheet();
        }}
        onPressMore={() => setSheetMode('expanded')}
        onPressDirection={() => {}}
      />

      {/* 사이드 메뉴 */}
      <SideMenu
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onPressActiveFestival={handlePressActiveFestivalFromMenu}
        onPressSavedFestivals={() => {
          setIsMenuOpen(false);
          router.push('/(tabs)/mypage/saved-festivals');
        }}
        onPressMyActivities={() => {
          setIsMenuOpen(false);
          router.push('/(tabs)/mypage/stay-mission-history');
        }}
        onPressSettings={() => {
          setIsMenuOpen(false);
          router.push('/(tabs)/mypage/settings');
        }}
      />

      {/* 필터 모달들 */}
      <DateFilterModal
        visible={activeFilter === 'date'}
        onClose={() => setActiveFilter(null)}
      />
      <CategoryFilterModal
        visible={activeFilter === 'category'}
        onClose={() => setActiveFilter(null)}
      />
      <PopularFilterModal
        visible={activeFilter === 'popular'}
        onClose={() => setActiveFilter(null)}
      />
      <RegionFilterModal
        visible={activeFilter === 'region'}
        onClose={() => setActiveFilter(null)}
      />
      <ScaleFilterModal
        visible={activeFilter === 'scale'}
        onClose={() => setActiveFilter(null)}
      />

      {/* 전체 화면 모달 */}
      <Modal
        visible={isEntryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEntryModalVisible(false)}
      >
        <View style={styles.entryModalOverlay}>
          <View style={styles.entryModalCard}>
            <View style={styles.entryEmojiCircle}>
              <Text style={{ fontSize: 32 }}>🎉</Text>
            </View>
            <Text style={styles.entryTitle}>축제 구역에 진입했습니다!</Text>
            <Text style={styles.entrySubtitle}>
              자동으로 축제 참여 상태가 활성화 됩니다.
            </Text>

            <TouchableOpacity
              style={styles.entryButton}
              onPress={() => setIsEntryModalVisible(false)}
              activeOpacity={0.9}
            >
              <Text style={styles.entryButtonText}>지도로 돌아가기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },

  header: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 3,
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    height: 40,
  },
  searchPlaceholder: { marginLeft: 6, fontSize: 13, color: '#9ca3af' },

  mapContainer: { flex: 1 },

  fakeMap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  fakeMapText: { fontSize: 13, color: '#9CA3AF' },

  // ✅ 지도 위 UI 레이어
  mapOverlayLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },

  squareButton: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    gap: 4,
  },
  squareButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },
  scaleIcon: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#60A5FA',
  },

  // ✅ 범례(딤 없음)
  legendOverlayTransparent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  legendCard: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 180,
    elevation: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 12,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  legendDot: { width: 22, height: 22, borderRadius: 11, marginRight: 10 },
  legendLabel: { fontSize: 13, fontWeight: '600', color: '#111827' },

  // ✅ 현재 위치 버튼
  currentLocationFab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    zIndex: 20,
  },

  // ✅ 하단 버튼
  listButtonWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  listButton: {
    paddingHorizontal: 24,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listButtonText: { color: '#ffffff', fontWeight: '600' },

  // 전체 화면 모달
  entryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryModalCard: {
    width: '80%',
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#6366F1',
  },
  entryEmojiCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  entrySubtitle: {
    fontSize: 13,
    color: '#E5E7EB',
    textAlign: 'center',
    marginBottom: 24,
  },
  entryButton: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  entryButtonText: { fontSize: 14, fontWeight: '600', color: '#4F46E5' },

  /* ✅ 축제 참여중 칩(사진처럼) */
  activeChip: {
    position: 'absolute',
    top: 12,
    left: 16,
    maxWidth: 230,
    backgroundColor: '#2563EB',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
  },
  activeChipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeChipEmojiCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  activeChipEmoji: {
    fontSize: 16,
  },
  activeChipTextCol: {
    flexDirection: 'column',
  },
  activeChipLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EAF2FF',
    marginBottom: 2,
  },
  activeChipTimer: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
