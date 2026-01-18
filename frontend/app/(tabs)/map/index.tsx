// app/(tabs)/map/index.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutChangeEvent,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// 지도 데이터/선택 상태
import { useMap } from '../../../hooks/useMap';
import { FilterChips } from './_components/FilterChips';
import { FloatingButtons } from './_components/FloatingButtons';
import { MapBottomSheet } from './_components/MapBottomSheet';
import { SideMenu } from './_components/SideMenu';
import {
  DateFilterModal,
  CategoryFilterModal,
  PopularFilterModal,
  RegionFilterModal,
  ScaleFilterModal,
} from './_components/FilterModals';

// react-native-maps 는 지금 안씀
// import MapView, { Marker } from 'react-native-maps';

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

  // 🔹 축제 참여 상태 / 전체 화면 모달
  const [isFestivalActive, setIsFestivalActive] = useState(false);
  const [isEntryModalVisible, setIsEntryModalVisible] = useState(false);

  const {
    events,
    selectedEvent,
    isBottomSheetOpen,
    handleMarkerPress,
    closeBottomSheet,
    focusCurrentLocation,
  } = useMap();

  const onPressDirection = () => {
    // TODO: 네이버/카카오 길찾기 연동
  };

  const onPressBookmarkList = () => {
    // TODO: 북마크한 축제 목록 화면으로 이동
  };

  // 🔹 사이드 메뉴에서 "참여 중인 축제" 카드 눌렀을 때
  const handlePressActiveFestivalFromMenu = () => {
    setIsMenuOpen(false);
    setIsFestivalActive(true);        // 지도 위 칩 ON
    setIsEntryModalVisible(true);     // 전체 화면 모달 ON
  };

  // 필터 칩 영역 레이아웃 측정
  const handleFilterLayout = (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    setFilterBottomY(y + height);
  };

  // 파란 "축제 목록 보기" 버튼
  const onPressFestivalList = () => {
    if (!events || events.length === 0) return;
    const first = events[0];
    handleMarkerPress(first);
    setSheetMode('collapsed');
  };

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
      <View onLayout={handleFilterLayout}>
        <FilterChips
          onPressDate={() => setActiveFilter('date')}
          onPressCategory={() => setActiveFilter('category')}
          onPressPopular={() => setActiveFilter('popular')}
          onPressRegion={() => setActiveFilter('region')}
          onPressScale={() => setActiveFilter('scale')}
        />
      </View>

      {/* 지도 영역 */}
      <View style={styles.mapContainer}>
        {/* 임시 지도 박스 */}
        <View style={styles.fakeMap}>
          <Text style={styles.fakeMapText}>
            (임시) 여기 지도 들어갈 자리입니다.
          </Text>
        </View>

        {/* 🔹 지도 위 상단 칩: "축제 참여 중" */}
        {isFestivalActive && (
          <View style={styles.festivalChip}>
            <View style={styles.festivalChipLeft}>
              <Ionicons name="ribbon-outline" size={18} color="#1D4ED8" />
              <View style={{ marginLeft: 8 }}>
                <Text style={styles.festivalChipLabel}>축제 참여 중</Text>
                <Text style={styles.festivalChipTitle}>한국교통대 대동제</Text>
              </View>
            </View>
            <Text style={styles.festivalChipTimer}>00:16:13</Text>
          </View>
        )}

        {/* 오른쪽 플로팅 버튼 */}
        <FloatingButtons
          onPressDirection={onPressDirection}
          onPressBookmarkList={onPressBookmarkList}
          onPressCurrentLocation={focusCurrentLocation}
        />

        {/* 초기 상태에서만 보이는 하단 "축제 목록 보기" 버튼 */}
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

      {/* 마커 클릭 / 축제 목록 클릭 시 바텀 시트 */}
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
        onPressDirection={onPressDirection}
      />

      {/* 왼쪽 햄버거 사이드 메뉴 */}
      <SideMenu
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onPressActiveFestival={handlePressActiveFestivalFromMenu}
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

      {/* 🔹 전체 화면 "축제 구역에 진입했습니다!" 모달 */}
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
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
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
  searchPlaceholder: {
    marginLeft: 6,
    fontSize: 13,
    color: '#9ca3af',
  },
  mapContainer: {
    flex: 1,
  },
  fakeMap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  fakeMapText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  listButtonWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  listButton: {
    paddingHorizontal: 24,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },

  /* 지도 위 상단 칩 */
  festivalChip: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  festivalChipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  festivalChipLabel: {
    fontSize: 11,
    color: '#4F46E5',
  },
  festivalChipTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  festivalChipTimer: {
    fontSize: 12,
    color: '#4B5563',
  },

  /* 전체 화면 모달 */
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
    // 보라-블루 느낌 단색 (간단히)
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
  entryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
});
