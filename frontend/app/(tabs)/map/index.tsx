// app/(tabs)/map/index.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useMap } from '../../../hooks/useMap';
import type { Event } from '../../../types/event';
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type SheetMode = 'collapsed' | 'expanded';

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<
    'date' | 'category' | 'popular' | 'region' | 'scale' | null
  >(null);

  // 작은 카드 / 큰 카드 상태
  const [sheetMode, setSheetMode] = useState<SheetMode>('collapsed');

  // 필터 칩 영역의 "아래 y좌표" (큰 카드 top 위치 계산용)
  const [filterBottomY, setFilterBottomY] = useState(0);

  const {
    region,
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

  // 필터 칩 영역 레이아웃 측정
  const handleFilterLayout = (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    setFilterBottomY(y + height); // 컨테이너 기준 "아래쪽" 좌표
  };

  const renderMarker = (event: Event) => (
    <Marker
      key={event.id}
      coordinate={{
        latitude: event.latitude,
        longitude: event.longitude,
      }}
      onPress={() => {
        handleMarkerPress(event);
        setSheetMode('collapsed'); // 마커 눌렀을 때는 항상 작은 카드부터
      }}
    >
      {/* TODO: 피그마 마커 스타일로 커스터마이징 */}
      <View style={styles.marker}>
        <Text style={styles.markerText}>5</Text>
      </View>
    </Marker>
  );

  // 파란 "축제 목록 보기" 버튼 클릭
  const onPressFestivalList = () => {
    if (!events || events.length === 0) return;
    const first = events[0];
    handleMarkerPress(first);   // useMap 안에서 시트 open + selectedEvent 설정
    setSheetMode('collapsed');  // 작은 카드 모드
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

      {/* 필터 칩들 (여기 높이를 재서 큰 카드 위치 계산) */}
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
        {region && (
          <MapView
            style={styles.map}
            region={region}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {events.map(renderMarker)}
          </MapView>
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
      <SideMenu visible={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

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
  map: {
    width: '100%',
    height: SCREEN_HEIGHT,
  },
  marker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
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
});
