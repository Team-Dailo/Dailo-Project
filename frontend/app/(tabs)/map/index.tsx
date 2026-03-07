// app/(tabs)/map/index.tsx
import React, { useMemo, useState, useEffect, useRef, Component } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutChangeEvent,
  Modal,
  Pressable,
  Animated,
  Easing,
  BackHandler,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import Constants from 'expo-constants';

import { MAP_UI } from '../../frontend/constants/colors';
import { SPACING } from '../../frontend/constants/spacing';
import { useAuth } from '../../frontend/hooks/useAuth';
import { useMap } from '../../frontend/hooks/useMap';
import { FilterChips } from '../../frontend/components/map/FilterChips';
import { DirectionScreen } from '../../frontend/components/map/DirectionScreen';
import { MapBottomSheet } from '../../frontend/components/map/MapBottomSheet';
import { NaverMap } from '../../frontend/components/map/NaverMap';
import type { NaverMapCamera } from '../../frontend/components/map/NaverMap';
import { ScaleIcon } from '../../frontend/components/map/ScaleIcon';
import { SideMenu } from '../../frontend/components/map/SideMenu';
import {
  DateFilterModal,
  CategoryFilterModal,
  ScaleFilterModal,
  type DateRange,
} from '../../frontend/components/map/FilterModals';

type SheetMode = 'collapsed' | 'expanded';

/** Expo Go에서는 네이버 지도 네이티브 모듈이 없어 크래시됨 → 안내만 표시 */
const isExpoGo = Constants.appOwnership === 'expo';

/** 지도 로드 실패 시 앱이 죽지 않도록 에러 바운더리 */
class MapErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.mapFallback}>
          <Text style={styles.mapFallbackText}>지도를 불러올 수 없습니다.</Text>
          <Text style={styles.mapFallbackSub}>
            네이버 클라우드 Client ID와 패키지명(com.app)을 확인하세요.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function MapScreen() {
  const festivalEntry = '17:30';
  const festivalElapsed = '00:17:37'
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<
    'date' | 'category' | 'scale' | null
  >(null);

  const [sheetMode, setSheetMode] = useState<SheetMode>('collapsed');
  const [filterBottomY, setFilterBottomY] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [filterChipsHeight, setFilterChipsHeight] = useState(0);
  const [collapsedSheetHeight, setCollapsedSheetHeight] = useState(0);

  // ✅ 필터 상태들
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedScale, setSelectedScale] = useState('all');

  // ✅ 상태 필터(예시: 오픈예정/진행중/종료) + 칩 표시값
  type StatusFilter = 'UPCOMING' | 'ONGOING' | 'ENDED';
  const STATUS_LABEL: Record<StatusFilter, string> = {
    UPCOMING: '오픈예정',
    ONGOING: '진행중',
    ENDED: '종료',
  };

  // 기본값: 오픈예정 + 진행중
  const [statusFilter, setStatusFilter] = useState<StatusFilter[]>([
    'UPCOMING',
    'ONGOING',
  ]);
  const statusFilterLabel = useMemo(() => {
    if (!statusFilter.length) return '전체';
    return statusFilter.map((v) => STATUS_LABEL[v]).join(', ');
  }, [statusFilter]);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // 축제 참여 배너 (로그인 + 축제 범위 진입 시 표시)
  const { isLoggedIn } = useAuth();
  const [isFestivalActive, setIsFestivalActive] = useState(false);
  const [festivalChipHeight, setFestivalChipHeight] = useState(0);

  useEffect(() => {
    setIsFestivalActive(isLoggedIn);
  }, [isLoggedIn]);

  // 범례(규모 설명)
  const [isScaleLegendVisible, setIsScaleLegendVisible] = useState(false);

  // 전체화면 진입 모달
  const [isEntryModalVisible, setIsEntryModalVisible] = useState(false);
  // 길찾기 화면
  const [isDirectionOpen, setIsDirectionOpen] = useState(false);
  // 현재 위치 버튼 눌렀을 때 파란 동그라미 표시
  const [showMyLocationCircle, setShowMyLocationCircle] = useState(false);
  const [myLocationCircleCoords, setMyLocationCircleCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const mapRef = useRef<React.ComponentRef<typeof NaverMap> | null>(null);

  const {
    region,
    currentLocation,
    events,
    selectedEvent,
    isBottomSheetOpen,
    handleMarkerPress,
    closeBottomSheet,
    focusCurrentLocation,
    refreshCurrentLocation,
  } = useMap();

  const naverMapCamera = useMemo((): NaverMapCamera => {
    if (!region) {
      return { latitude: 37.5665, longitude: 126.978, zoom: 14 };
    }
    const zoom = 14 - Math.round(Math.log2(region.latitudeDelta / 0.01));
    return {
      latitude: region.latitude,
      longitude: region.longitude,
      zoom: Math.min(18, Math.max(10, zoom)),
    };
  }, [region?.latitude, region?.longitude, region?.latitudeDelta]);

  // 에뮬/위치 못 받을 때 쓰는 기본 좌표 (서울 시청)
  const FALLBACK_COORDS = { latitude: 37.5665, longitude: 126.978 };

  const onFocusCurrentLocation = async () => {
    setShowMyLocationCircle(true);

    let coords = currentLocation ?? (await refreshCurrentLocation());

    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) {
      Alert.alert(
        '위치 권한 필요',
        '현재 위치를 쓰려면 설정에서 위치 권한을 허용해 주세요.',
        [
          { text: '취소', style: 'cancel' },
          { text: '설정 열기', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    if (!coords) coords = FALLBACK_COORDS;

    setMyLocationCircleCoords(coords);
    focusCurrentLocation();

    if (mapRef.current) {
      mapRef.current.animateCameraTo({
        latitude: coords.latitude,
        longitude: coords.longitude,
        zoom: 15,
        duration: 500,
        easing: 'EaseOut',
      });
    }
  };

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

  // 규모·북마크: 필터 칩 줄 바로 아래 10dp, 같은 수평 라인
  const chipPush = isFestivalActive ? (festivalChipHeight || 60) + 10 : 0;
  const scaleTop = filterBottomY + 10 + chipPush;
  const scaleLeft = SPACING.scaleButtonLeft;
  const bookmarkTop = scaleTop;
  const bookmarkRight = SPACING.base;

  // 규모 팝업 위치
  const SCALE_BTN_WIDTH = 56;
  const popupLeft = scaleLeft + SCALE_BTN_WIDTH + SPACING.popupGap;
  const popupTop = scaleTop + 2;

  // 규모 설명 팝업 애니메이션
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isScaleLegendVisible) {
      scaleAnim.setValue(0.96);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
      ]).start();
    }
  }, [isScaleLegendVisible, scaleAnim, opacityAnim]);

  const closeScalePopup = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 140,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }),
    ]).start(() => setIsScaleLegendVisible(false));
  };

  const legendItems = useMemo(
    () => [
      { color: MAP_UI.scaleBadge[0], label: '시·군·구' },
      { color: MAP_UI.scaleBadge[1], label: '대학교' },
      { color: MAP_UI.scaleBadge[2], label: '단과대/학생회' },
      { color: MAP_UI.scaleBadge[3], label: '동아리/소모임' },
      { color: MAP_UI.scaleBadge[4], label: '개인' },
    ],
    []
  );

  // 필터칩 위 여백
  const headerBottomGap = 12;
  useEffect(() => {
    setFilterBottomY(headerHeight + headerBottomGap + filterChipsHeight);
  }, [headerHeight, filterChipsHeight]);

  // 폰 백버튼: 한 단계씩
  useEffect(() => {
    if (!isBottomSheetOpen) return;

    const onBack = () => {
      if (sheetMode === 'expanded') {
        setSheetMode('collapsed');
      } else {
        setSheetMode('collapsed');
        closeBottomSheet();
      }
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [isBottomSheetOpen, sheetMode, closeBottomSheet]);

  return (
    <View style={styles.container}>
      <View style={styles.mapArea}>
        <View style={[styles.mapContainer, StyleSheet.absoluteFill]}>
          {isExpoGo ? (
            <View style={styles.mapFallback}>
              <Text style={styles.mapFallbackText}>
                지도는 개발 빌드에서만 이용할 수 있습니다.
              </Text>
              <Text style={styles.mapFallbackSub}>
                터미널에서 {'npx expo run:android'} 로 실행해 주세요.
              </Text>
            </View>
          ) : (
            <MapErrorBoundary>
              <NaverMap
                ref={mapRef}
                style={StyleSheet.absoluteFill}
                camera={naverMapCamera}
                events={events ?? []}
                onMarkerPress={handleMarkerPress}
                currentLocation={currentLocation ?? null}
                circleCoords={myLocationCircleCoords}
                showMyLocationCircle={showMyLocationCircle}
              />
            </MapErrorBoundary>
          )}

          {isBottomSheetOpen ? (
            <Pressable
              style={[
                StyleSheet.absoluteFill,
                { zIndex: 5, bottom: collapsedSheetHeight > 0 ? collapsedSheetHeight + 10 : 280 },
              ]}
              onPress={() => {
                setSheetMode('collapsed');
                closeBottomSheet();
              }}
            />
          ) : null}

          <View
            pointerEvents="box-none"
            style={[styles.mapOverlayLayer, { zIndex: 10 }]}
          >
            {isFestivalActive && (
              <View
                style={[
                  styles.activeChip,
                  {
                    top: filterBottomY + 10,
                    left: SPACING.base,
                  },
                ]}
                onLayout={(e) => setFestivalChipHeight(e.nativeEvent.layout.height)}
              >
                <View style={styles.activeChipLeft}>
                  <View style={styles.activeChipIconCircle}>
                    <Text style={styles.activeChipEmoji}>🎉</Text>
                  </View>
                  <View style={styles.activeChipTextCol}>
                    <Text style={styles.activeChipLabel}>축제 참여 중</Text>
                    <Text style={styles.activeChipTimer}>00:17:37</Text>
                  </View>
                </View>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.scaleButton,
                {
                  left: scaleLeft,
                  top: scaleTop,
                  backgroundColor: pressed ? MAP_UI.scalePressed : MAP_UI.cardBg,
                  borderWidth: isScaleLegendVisible ? 1.5 : 0,
                  borderColor: isScaleLegendVisible ? MAP_UI.scaleActive : 'transparent',
                },
              ]}
              onPress={() => setIsScaleLegendVisible((v) => !v)}
              hitSlop={SPACING.hitSlop}
            >
              <View style={styles.scaleButtonIconArea}>
                <ScaleIcon />
              </View>
              <Text style={styles.scaleButtonText}>규모</Text>
            </Pressable>

            <TouchableOpacity
              style={[
                styles.bookmarkButton,
                { right: bookmarkRight, top: bookmarkTop },
              ]}
              activeOpacity={0.85}
              onPress={onPressBookmarkList}
            >
              <View style={styles.bookmarkButtonIconArea}>
                <Ionicons name="bookmark" size={28} color="#3B82F6" />
              </View>
              <Text style={styles.bookmarkButtonText}>북마크</Text>
            </TouchableOpacity>

            {isScaleLegendVisible && (
              <>
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={closeScalePopup}
                />
                <Animated.View
                  style={[
                    styles.scalePopupCard,
                    { left: popupLeft, top: popupTop, zIndex: 100 },
                    {
                      opacity: opacityAnim,
                      transform: [{ scale: scaleAnim }],
                    },
                  ]}
                  pointerEvents="box-none"
                >
                  <Pressable onPress={() => {}} style={styles.scalePopupInner}>
                    {legendItems.map((it, i) => (
                      <View
                        key={it.label}
                        style={[
                          styles.scalePopupRow,
                          i === legendItems.length - 1 && { marginBottom: 0 },
                        ]}
                      >
                        <View
                          style={[
                            styles.scalePopupBadge,
                            { backgroundColor: it.color },
                          ]}
                        />
                        <Text style={styles.scalePopupLabel}>{it.label}</Text>
                      </View>
                    ))}
                  </Pressable>
                </Animated.View>
              </>
            )}
          </View>

          <View
            style={[
              styles.listButtonWrapper,
              {
                bottom:
                  isBottomSheetOpen && sheetMode === 'expanded'
                    ? 34
                    : !isBottomSheetOpen
                      ? 34
                      : collapsedSheetHeight > 0
                        ? collapsedSheetHeight + 10
                        : 230,
              },
            ]}
          >
            {!isBottomSheetOpen && (
              <View style={styles.listButtonCenterFull}>
                <TouchableOpacity
                  style={styles.listButton}
                  activeOpacity={0.85}
                  onPress={onPressFestivalList}
                >
                  <Text style={styles.listButtonText}>축제 목록 보기</Text>
                </TouchableOpacity>
              </View>
            )}

            {(!isBottomSheetOpen || sheetMode === 'expanded') && (
              <TouchableOpacity
                style={styles.currentLocationButton}
                activeOpacity={0.85}
                onPress={onFocusCurrentLocation}
                accessibilityLabel="현재 위치"
              >
                <Ionicons name="locate" size={22} color="#2563EB" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View
          style={[styles.header, { paddingTop: insets.top + 8 }]}
          onLayout={(e: LayoutChangeEvent) =>
            setHeaderHeight(e.nativeEvent.layout.height)
          }
        >
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setIsMenuOpen(true)}
          >
            <Ionicons name="menu" size={22} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.searchBox}
            activeOpacity={0.8}
            onPress={() => router.push({ pathname: '/search', params: { from: 'map' } })}
          >
            <Ionicons name="search" size={18} color="#9ca3af" />
            <Text style={styles.searchPlaceholder}>
              지역 축제 / 대학교 행사 / 장소 입력
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[styles.filterChipsOverlay, { top: headerHeight + headerBottomGap }]}
          onLayout={(e: LayoutChangeEvent) =>
            setFilterChipsHeight(e.nativeEvent.layout.height)
          }
        >
          <FilterChips
            onPressDate={() => setActiveFilter('date')}
            onPressCategory={() => setActiveFilter('category')}
            onPressPopular={() => setIsStatusModalOpen(true)}
            onPressScale={() => setActiveFilter('scale')}
            popularValueLabel={statusFilterLabel}
          />
        </View>
      </View>

      <View
        style={[
          styles.sheetWrapper,
          isBottomSheetOpen && sheetMode === 'expanded' && styles.sheetWrapperOnTop,
        ]}
        pointerEvents="box-none"
      >
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
          onPressDirection={() => setIsDirectionOpen(true)}
          onPressBack={() => {
            if (sheetMode === 'expanded') {
              setSheetMode('collapsed');
            } else {
              setSheetMode('collapsed');
              closeBottomSheet();
            }
          }}
          onCollapsedHeightChange={setCollapsedSheetHeight}
          onPressCurrentLocation={onFocusCurrentLocation}
        />
      </View>

      <DirectionScreen
        visible={isDirectionOpen}
        event={selectedEvent}
        onClose={() => setIsDirectionOpen(false)}
      />

      <SideMenu
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        festivalEntry={festivalEntry}
        festivalElapsed={festivalElapsed}
        onPressDirection={() => {
          setIsMenuOpen(false);
          setIsDirectionOpen(true);
        }}
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

      <DateFilterModal
        visible={activeFilter === 'date'}
        onClose={() => setActiveFilter(null)}
        selectedDateRange={selectedDateRange}
        onSelectDateRange={setSelectedDateRange}
      />

      <CategoryFilterModal
        visible={activeFilter === 'category'}
        onClose={() => setActiveFilter(null)}
        selectedValue={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <ScaleFilterModal
        visible={activeFilter === 'scale'}
        onClose={() => setActiveFilter(null)}
        selectedValue={selectedScale}
        onSelect={setSelectedScale}
      />

      <Modal
        visible={isStatusModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsStatusModalOpen(false)}
      >
        <Pressable
          style={styles.statusModalBackdrop}
          onPress={() => setIsStatusModalOpen(false)}
        >
          <Pressable style={styles.statusModalCard} onPress={() => {}}>
            <View style={styles.statusModalHeader}>
              <Text style={styles.statusModalTitle}>상태</Text>
              <Pressable onPress={() => setIsStatusModalOpen(false)}>
                <Ionicons name="close" size={22} />
              </Pressable>
            </View>

            {(['UPCOMING', 'ONGOING', 'ENDED'] as StatusFilter[]).map((v) => {
              const checked = statusFilter.includes(v);
              return (
                <TouchableOpacity
                  key={v}
                  activeOpacity={0.85}
                  onPress={() => {
                    setStatusFilter((prev) =>
                      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
                    );
                  }}
                  style={styles.statusRow}
                >
                  <Text style={styles.statusRowText}>{STATUS_LABEL[v]}</Text>
                  <Ionicons
                    name={checked ? 'checkbox' : 'square-outline'}
                    size={22}
                  />
                </TouchableOpacity>
              );
            })}

            <View style={styles.statusActions}>
              <Pressable
                onPress={() => setStatusFilter([])}
                style={[styles.statusBtn, styles.statusBtnGhost]}
              >
                <Text>초기화</Text>
              </Pressable>
              <Pressable
                onPress={() => setIsStatusModalOpen(false)}
                style={[styles.statusBtn, styles.statusBtnPrimary]}
              >
                <Text style={{ color: 'white' }}>적용</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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

  sheetWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 0,
  },
  sheetWrapperOnTop: {
    zIndex: 1000,
  },

  mapArea: {
    flex: 1,
    position: 'relative',
  },
  filterChipsOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'center',
    zIndex: 11,
    backgroundColor: '#ffffff',
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

  mapContainer: {},
  mapFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 24,
  },
  mapFallbackText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  mapFallbackSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },

  mapOverlayLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },

  scaleButton: {
    position: 'absolute',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 72,
    borderRadius: 14,
    paddingVertical: 2,
    paddingHorizontal: 0,
    gap: 8,
    elevation: 8,
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 18,
  },
  scaleButtonIconArea: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scaleButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: MAP_UI.textDark,
    height: 18,
    lineHeight: 18,
    textAlign: 'center',
  },

  bookmarkButton: {
    position: 'absolute',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 72,
    borderRadius: 14,
    backgroundColor: MAP_UI.cardBg,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 6,
    elevation: 8,
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 18,
  },
  bookmarkButtonIconArea: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookmarkButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: MAP_UI.textDark,
    textAlign: 'center',
  },

  scalePopupCard: {
    position: 'absolute',
    width: SPACING.popupWidth,
    backgroundColor: MAP_UI.cardBg,
    borderRadius: SPACING.popupRadius,
    paddingVertical: SPACING.popupPadding,
    paddingHorizontal: SPACING.popupPadding,
    elevation: 12,
    shadowColor: 'rgba(0,0,0,0.18)',
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 22,
  },
  scalePopupInner: { padding: 0 },
  scalePopupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: SPACING.popupRowHeight,
    marginBottom: SPACING.popupRowGap,
  },
  scalePopupBadge: {
    width: SPACING.badgeSize,
    height: SPACING.badgeSize,
    borderRadius: 10,
    marginRight: SPACING.badgeTextGap,
  },
  scalePopupLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: MAP_UI.textDark,
  },

  listButtonWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  listButtonCenterFull: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'center',
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
  listButtonText: { color: '#ffffff', fontWeight: '600' },
  currentLocationButton: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: MAP_UI.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
  },

  statusModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  statusModalCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
  },
  statusModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusModalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statusRowText: {
    fontSize: 15,
  },
  statusActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  statusBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  statusBtnGhost: { backgroundColor: '#f2f2f2' },
  statusBtnPrimary: { backgroundColor: '#111' },

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

  activeChip: {
    position: 'absolute',
    width: 123,
    height: 46,
    backgroundColor: '#2563EB',
    borderRadius: 23,
    paddingVertical: 6,
    paddingHorizontal: 8,
    justifyContent: 'center',
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
  activeChipIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E9E0F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  activeChipEmoji: {
    fontSize: 14,
  },
  activeChipTextCol: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  activeChipLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 1,
  },
  activeChipTimer: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});