// app/(tabs)/map/index.tsx
import React, { useMemo, useState, useEffect, useRef, Component } from 'react';
import {
  View,
  Text,
  TextInput,
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
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import Constants from 'expo-constants';

import { MAP_UI } from '../../../constants/colors';
import { SPACING } from '../../../constants/spacing';
import { useAuth } from '../../../hooks/useAuth';
import { useMap } from '../../../hooks/useMap';
import { FilterChips } from './_components/FilterChips';
import { DirectionScreen } from './_components/DirectionScreen';
import { MapBottomSheet } from './_components/MapBottomSheet';
import { NaverMap } from './_components/NaverMap';
import type { NaverMapCamera } from './_components/NaverMap';
import { ScaleIcon } from './_components/ScaleIcon';
import { SideMenu } from './_components/SideMenu';
import {
  DateFilterModal,
  CategoryFilterModal,
  PopularFilterModal,
  RegionFilterModal,
  ScaleFilterModal,
} from './_components/FilterModals';
import { searchEventsForMap } from '../../../services/event.service';

/** 지역명 → 지도 중심 좌표 (지도 탭 검색용) */
const REGION_CENTERS: Record<string, { latitude: number; longitude: number }> = {
  충주: { latitude: 36.991, longitude: 127.926 },
  충주시: { latitude: 36.991, longitude: 127.926 },
  충북: { latitude: 36.636, longitude: 127.491 },
  충청북도: { latitude: 36.636, longitude: 127.491 },
  서울: { latitude: 37.5665, longitude: 126.978 },
  대전: { latitude: 36.3504, longitude: 127.3845 },
  대구: { latitude: 35.8714, longitude: 128.6014 },
  부산: { latitude: 35.1796, longitude: 129.0756 },
  인천: { latitude: 37.4563, longitude: 126.7052 },
  광주: { latitude: 35.1595, longitude: 126.8526 },
  한국: { latitude: 36.3504, longitude: 127.3845 },
};

type SheetMode = 'collapsed' | 'expanded';

/** Expo Go에서는 네이버 지도 네이티브 모듈이 없어 크래시됨 → 안내만 표시 */
const isExpoGo = Constants.appOwnership === 'expo';

/** 지도 로드 실패 시 앱이 죽지 않도록 에러 바운더리 */
class MapErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError = () => ({ hasError: true });
  render() {
    if (this.state.hasError)
      return (
        <View style={styles.mapFallback}>
          <Text style={styles.mapFallbackText}>지도를 불러올 수 없습니다.</Text>
          <Text style={styles.mapFallbackSub}>
            네이버 지도 연결을 확인해 주세요.{'\n'}
            • 개발 빌드로 실행 중인지 확인 (npx expo run:android){'\n'}
            • 네트워크 연결 확인{'\n'}
            • 네이버 클라우드 Client ID·패키지명 확인
          </Text>
        </View>
      );
    return this.props.children;
  }
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ moveToLat?: string; moveToLng?: string }>();
  const moveToLat = searchParams.moveToLat;
  const moveToLng = searchParams.moveToLng;

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<
    'date' | 'category' | 'popular' | 'region' | 'scale' | null
  >(null);

  const [sheetMode, setSheetMode] = useState<SheetMode>('collapsed');
  const [filterBottomY, setFilterBottomY] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [filterChipsHeight, setFilterChipsHeight] = useState(0);
  const [collapsedSheetHeight, setCollapsedSheetHeight] = useState(0);

  // 축제 참여 배너 (로그인 + 축제 범위 진입 시 표시)
  const { isLoggedIn } = useAuth();
  const [isFestivalActive, setIsFestivalActive] = useState(false);
  const [festivalChipHeight, setFestivalChipHeight] = useState(0);

  // 로그인 상태에서 축제 범위로 들어온 것으로 간주 → 참여 중 칩·사이드메뉴 카드 표시 (mock)
  useEffect(() => {
    setIsFestivalActive(isLoggedIn);
  }, [isLoggedIn]);

  // 지도 탭 검색창 입력값 + 검색 중
  const [mapSearchKeyword, setMapSearchKeyword] = useState('');
  const [mapSearching, setMapSearching] = useState(false);

  // 범례(규모 설명)
  const [isScaleLegendVisible, setIsScaleLegendVisible] = useState(false);

  // 전체화면 진입 모달 (기존)
  const [isEntryModalVisible, setIsEntryModalVisible] = useState(false);
  // 길찾기 화면 (큰 카드에서 길찾기 버튼)
  const [isDirectionOpen, setIsDirectionOpen] = useState(false);
  // 현재 위치 버튼 눌렀을 때 파란 동그라미 표시 (fallback일 때도 동그라미 그리기 위해)
  const [showMyLocationCircle, setShowMyLocationCircle] = useState(false);
  const [myLocationCircleCoords, setMyLocationCircleCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const mapRef = useRef<React.ComponentRef<typeof NaverMap> | null>(null);
  /** 지도 드래그/줌 후 실제 화면 상태. setRegion 하지 않고 ref만 갱신해 지도가 제멋대로 움직이지 않게 함 */
  const lastCameraRef = useRef<{ latitude: number; longitude: number; zoom: number } | null>(null);

  const {
    region,
    setRegion,
    currentLocation,
    events,
    selectedEvent,
    isBottomSheetOpen,
    handleMarkerPress,
    closeBottomSheet,
    focusCurrentLocation,
    refreshCurrentLocation,
    refetchMapEvents,
    refetchWithBounds,
  } = useMap();

  const cameraIdleFetchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (cameraIdleFetchRef.current) clearTimeout(cameraIdleFetchRef.current);
  }, []);

  // 지도 탭에 들어올 때마다 현재 영역으로 행사 다시 조회 → 위도/경도 수정 후 바로 반영
  useFocusEffect(
    React.useCallback(() => {
      refetchMapEvents();
    }, [refetchMapEvents])
  );

  // 검색 화면에서 지도 이동 요청 시 해당 좌표로 카메라 이동 후 파라미터 제거
  const appliedMoveToRef = useRef(false);
  useEffect(() => {
    if (moveToLat == null || moveToLng == null) {
      appliedMoveToRef.current = false;
      return;
    }
    if (appliedMoveToRef.current) return;
    appliedMoveToRef.current = true;
    const lat = Number(moveToLat);
    const lng = Number(moveToLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    if (mapRef.current) {
      mapRef.current.animateCameraTo({
        latitude: lat,
        longitude: lng,
        zoom: 15,
        duration: 400,
        easing: 'EaseOut',
      });
    }
    router.replace('/(tabs)/map');
  }, [moveToLat, moveToLng, setRegion]);

  const runMapSearch = async () => {
    const k = mapSearchKeyword.trim();
    if (!k) return;
    Keyboard.dismiss();
    setMapSearching(true);
    try {
      const eventResults = await searchEventsForMap(k, 10);
      if (eventResults.length > 0) {
        const first = eventResults[0];
        const lat = first.latitude!;
        const lng = first.longitude!;
        setRegion({
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        if (mapRef.current) {
          mapRef.current.animateCameraTo({
            latitude: lat,
            longitude: lng,
            zoom: 15,
            duration: 400,
            easing: 'EaseOut',
          });
        }
        return;
      }
      const regionKey = Object.keys(REGION_CENTERS).find(
        (r) => r === k || k.includes(r) || r.includes(k)
      );
      if (regionKey) {
        const { latitude, longitude } = REGION_CENTERS[regionKey];
        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        if (mapRef.current) {
          mapRef.current.animateCameraTo({
            latitude,
            longitude,
            zoom: 14,
            duration: 400,
            easing: 'EaseOut',
          });
        }
        return;
      }
      Alert.alert('검색 결과 없음', '해당하는 행사나 지역을 찾지 못했어요.');
    } catch {
      Alert.alert('검색 실패', '잠시 후 다시 시도해 주세요.');
    } finally {
      setMapSearching(false);
    }
  };

  const DEFAULT_CAMERA: NaverMapCamera = { latitude: 37.5665, longitude: 126.978, zoom: 14 };
  /** zoom 레벨 → latitudeDelta (naverMapCamera 공식과 맞춤) */
  const zoomToDelta = (zoom: number) => 0.01 * Math.pow(2, 14 - Math.min(18, Math.max(10, zoom)));

  const naverMapCamera = useMemo((): NaverMapCamera => {
    if (!region) return DEFAULT_CAMERA;
    const lat = Number(region.latitude);
    const lng = Number(region.longitude);
    const delta = Number(region.latitudeDelta);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(delta) || delta <= 0)
      return DEFAULT_CAMERA;
    const zoom = 14 - Math.round(Math.log2(delta / 0.01));
    return {
      latitude: lat,
      longitude: lng,
      zoom: Math.min(18, Math.max(10, zoom)),
    };
  }, [region?.latitude, region?.longitude, region?.latitudeDelta]);

  // 검색/현재위치 등으로 setRegion 하면 ref도 맞춰 두어 확대·축소가 그 위치 기준으로 동작
  useEffect(() => {
    if (region)
      lastCameraRef.current = {
        latitude: region.latitude,
        longitude: region.longitude,
        zoom: naverMapCamera.zoom,
      };
  }, [region?.latitude, region?.longitude, region?.latitudeDelta, naverMapCamera.zoom]);

  // 에뮬/위치 못 받을 때 쓰는 기본 좌표 (서울 시청)
  const FALLBACK_COORDS = { latitude: 37.5665, longitude: 126.978 };

  const onFocusCurrentLocation = async () => {
    setShowMyLocationCircle(true);
    let coords =
      currentLocation ?? (await refreshCurrentLocation());
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
    // 권한은 있는데 위치 못 받음(에뮬 등) → 기본 좌표로라도 이동해서 버튼이 동작한 것처럼
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

  // 규모·북마크: 필터 칩 줄 바로 아래 10dp, 같은 수평 라인 (축제 참여 칩 있으면 아래로 밀기)
  const chipPush = isFestivalActive ? (festivalChipHeight || 60) + 10 : 0;
  const scaleTop = filterBottomY + 10 + chipPush;
  const scaleLeft = SPACING.scaleButtonLeft;
  const bookmarkTop = scaleTop;
  const bookmarkRight = SPACING.base;

  // 규모 팝업: 규모 버튼 오른쪽 10dp, 팝업 상단은 버튼 상단보다 2dp 아래
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
  }, [isScaleLegendVisible]);
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

  // 하단 탭 바 높이 + safe area만큼 올려서 탭과 겹치지 않게
  const TAB_BAR_HEIGHT = 60;
  const bottomInset = insets.bottom ?? 0;
  const tabBarOffset = TAB_BAR_HEIGHT + bottomInset;

  // 필터칩 위 여백: 검색창과 필터칩 사이 간격 (이전처럼 복원)
  const headerBottomGap = 12;
  useEffect(() => {
    setFilterBottomY(headerHeight + headerBottomGap + filterChipsHeight);
  }, [headerHeight, filterChipsHeight]);

  // 폰 백버튼: 한 단계씩 (확장→작은카드, 작은카드→닫기)
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
  }, [isBottomSheetOpen, sheetMode]);

  return (
    <View style={styles.container}>
      {/* 지도 영역: 전체를 채우고, 그 위에 헤더·필터칩·버튼이 오버레이 */}
      <View style={styles.mapArea}>
        <View style={[styles.mapContainer, StyleSheet.absoluteFill]}>
          {isExpoGo ? (
            <View style={styles.mapFallback}>
              <Text style={styles.mapFallbackText}>지도는 개발 빌드에서만 이용할 수 있습니다.</Text>
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
                onCameraIdle={(params) => {
                  const r = params.region;
                  if (!r || !Number.isFinite(r.latitude) || !Number.isFinite(r.longitude)) return;
                  const centerLat = r.latitude + r.latitudeDelta / 2;
                  const centerLng = r.longitude + r.longitudeDelta / 2;
                  const zoom = 14 - Math.round(Math.log2(r.latitudeDelta / 0.01));
                  lastCameraRef.current = {
                    latitude: centerLat,
                    longitude: centerLng,
                    zoom: Math.min(18, Math.max(10, zoom)),
                  };
                  // region 상태는 건드리지 않음 → 지도가 혼자 움직이지 않음. 해당 영역 행사만 디바운스 조회
                  if (cameraIdleFetchRef.current) clearTimeout(cameraIdleFetchRef.current);
                  cameraIdleFetchRef.current = setTimeout(() => {
                    cameraIdleFetchRef.current = null;
                    refetchWithBounds(centerLat, centerLng, r.latitudeDelta, r.longitudeDelta);
                  }, 600);
                }}
                currentLocation={currentLocation ?? null}
                circleCoords={myLocationCircleCoords}
                showMyLocationCircle={showMyLocationCircle}
              />
            </MapErrorBoundary>
          )}

          {/* 지도 빈 영역 탭 시: 시트 닫기. 시트 영역은 덮지 않아서 더보기/시트 터치가 정상 동작 */}
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
          {/* 지도 위 UI 레이어 */}
          <View
            pointerEvents="box-none"
            style={[
              styles.mapOverlayLayer,
              { zIndex: isBottomSheetOpen ? 10 : 10 },
            ]}
          >
            {/* 카테고리 아래·규모 버튼 위: 참여 중인 시간 칩 (로그인 + 축제 범위 시) */}
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

            {/* 규모·북마크: 필터 칩 아래 10dp, 같은 수평 라인 */}
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

          {/* 하단: 축제 목록 보기 + 확대/축소·현재위치. 마커 선택 시 작은 카드 위로 올려서 유지 */}
          <View
              style={[
                styles.listButtonWrapper,
                {
                  bottom: tabBarOffset + (isBottomSheetOpen && sheetMode === 'expanded'
                    ? -68
                    : !isBottomSheetOpen
                      ? -68
                      : collapsedSheetHeight > 0
                        ? collapsedSheetHeight - 68
                        : 62),
                },
              ]}
          >
            <View style={styles.listButtonCenterFull}>
              <TouchableOpacity
                style={styles.listButton}
                activeOpacity={0.85}
                onPress={onPressFestivalList}
              >
                <Text style={styles.listButtonText}>축제 목록 보기</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.zoomAndLocationColumn}>
                <View style={styles.zoomControlBox}>
                  <TouchableOpacity
                    style={styles.zoomButton}
                    onPress={() => {
                      const cam = lastCameraRef.current ?? (region ? { latitude: region.latitude, longitude: region.longitude, zoom: naverMapCamera.zoom } : null) ?? DEFAULT_CAMERA;
                      if (!mapRef.current || !cam) return;
                      const newZoom = Math.min(18, cam.zoom + 1);
                      const delta = zoomToDelta(newZoom);
                      setRegion({
                        latitude: cam.latitude,
                        longitude: cam.longitude,
                        latitudeDelta: delta,
                        longitudeDelta: delta,
                      });
                      lastCameraRef.current = { ...cam, zoom: newZoom };
                      mapRef.current.animateCameraTo({
                        latitude: cam.latitude,
                        longitude: cam.longitude,
                        zoom: newZoom,
                        duration: 200,
                        easing: 'EaseOut',
                      });
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={20} color="#374151" />
                  </TouchableOpacity>
                  <View style={styles.zoomDivider} />
                  <TouchableOpacity
                    style={styles.zoomButton}
                    onPress={() => {
                      const cam = lastCameraRef.current ?? (region ? { latitude: region.latitude, longitude: region.longitude, zoom: naverMapCamera.zoom } : null) ?? DEFAULT_CAMERA;
                      if (!mapRef.current || !cam) return;
                      const newZoom = Math.max(10, cam.zoom - 1);
                      const delta = zoomToDelta(newZoom);
                      setRegion({
                        latitude: cam.latitude,
                        longitude: cam.longitude,
                        latitudeDelta: delta,
                        longitudeDelta: delta,
                      });
                      lastCameraRef.current = { ...cam, zoom: newZoom };
                      mapRef.current.animateCameraTo({
                        latitude: cam.latitude,
                        longitude: cam.longitude,
                        zoom: newZoom,
                        duration: 200,
                        easing: 'EaseOut',
                      });
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="remove" size={20} color="#374151" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.currentLocationButton}
                  activeOpacity={0.85}
                  onPress={onFocusCurrentLocation}
                  accessibilityLabel="현재 위치"
                >
                <Ionicons name="locate" size={22} color="#2563EB" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 헤더: 지도 위 오버레이 */}
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
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="지역, 행사명, 장소 입력"
              placeholderTextColor="#9ca3af"
              value={mapSearchKeyword}
              onChangeText={setMapSearchKeyword}
              onSubmitEditing={runMapSearch}
              returnKeyType="search"
              editable={!mapSearching}
            />
            <TouchableOpacity
              style={styles.searchSubmitButton}
              onPress={runMapSearch}
              disabled={mapSearching}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {mapSearching ? (
                <ActivityIndicator size="small" color="#6366F1" />
              ) : (
                <Ionicons name="search" size={20} color="#6366F1" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 필터 칩: 지도 위 오버레이, 검색창 아래 여백 후 배치 */}
        <View
          style={[styles.filterChipsOverlay, { top: headerHeight + headerBottomGap }]}
          onLayout={(e: LayoutChangeEvent) =>
            setFilterChipsHeight(e.nativeEvent.layout.height)
          }
        >
          <FilterChips
            onPressDate={() => setActiveFilter('date')}
            onPressCategory={() => setActiveFilter('category')}
            onPressPopular={() => setActiveFilter('popular')}
            onPressRegion={() => setActiveFilter('region')}
            onPressScale={() => setActiveFilter('scale')}
          />
        </View>
      </View>

      {/* 바텀시트: 큰 카드일 때 다른 버튼들보다 가장 위에 표시 */}
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

      {/* 길찾기 화면 (큰 카드 → 길찾기 버튼) */}
      <DirectionScreen
        visible={isDirectionOpen}
        event={selectedEvent}
        onClose={() => setIsDirectionOpen(false)}
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
        onPressDirection={() => {
          setIsMenuOpen(false);
          if (selectedEvent) {
            setIsDirectionOpen(true);
          } else {
            Alert.alert('안내', '지도에서 축제 마커를 탭한 뒤 길찾기를 사용해 주세요.');
          }
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
    minHeight: 200,
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
    paddingLeft: 12,
    paddingRight: 4,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 8,
    paddingRight: 4,
  },
  searchSubmitButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

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

  // 지도 위 UI 레이어
  mapOverlayLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },

  // 규모 버튼: 북마크와 동일 56x72, radius 14
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
  // 북마크 버튼: 56x72, radius 14, elevation 8, 아이콘 28dp
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

  // 규모 설명 팝업: 170dp, radius 18, elevation 12, 핀 20dp
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

  // 하단: 축제 목록 + 현재 위치. 아래쪽 맞춤(축제목록보기·현재위치 버튼 하단 일치)
  listButtonWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 20,
  },
  listButtonCenterFull: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
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
  zoomAndLocationColumn: {
    position: 'absolute',
    right: 16,
    bottom: 0,
    alignItems: 'center',
    gap: 8,
  },
  zoomControlBox: {
    width: 44,
    borderRadius: 10,
    backgroundColor: MAP_UI.cardBg,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
  },
  zoomButton: {
    width: 44,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 6,
  },
  currentLocationButton: {
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

  /* ✅ 축제 참여 중 칩: 가로 123 : 세로 46 비율, 라벨 10 / 시간 13 */
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
