// 관리자 - 축제 구역 다각형 편집기
import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import {
  NaverMapView,
  NaverMapMarkerOverlay,
  NaverMapPolygonOverlay,
  type NaverMapViewRef,
} from '@mj-studio/react-native-naver-map';
import {
  getZonePickRequest,
  clearZonePickRequest,
  setZonePickResult,
  type ZoneVertex,
} from '../../../services/festivalZonePickStore';

const MAP_HEIGHT = Dimensions.get('window').height * 0.55;

/** km → 위도 변화량 */
function kmToDeltaLat(km: number) {
  return km / 111;
}
/** km → 경도 변화량 (위도에 따라 보정) */
function kmToDeltaLng(km: number, lat: number) {
  return km / (111 * Math.cos((lat * Math.PI) / 180));
}

/** 정n각형 꼭짓점 생성 (시계 방향, 북쪽 꼭짓점 기준) */
function makeRegularPolygon(
  centerLat: number,
  centerLng: number,
  radiusKm: number,
  n: number
): ZoneVertex[] {
  const dLat = kmToDeltaLat(radiusKm);
  const dLng = kmToDeltaLng(radiusKm, centerLat);
  return Array.from({ length: n }, (_, i) => {
    const angle = (2 * Math.PI * i) / n; // 0 = 북쪽, 시계 방향
    return {
      lat: centerLat + dLat * Math.cos(angle),
      lng: centerLng + dLng * Math.sin(angle),
    };
  });
}

const PRESET_SHAPES = [
  { label: '사각형', n: 4 },
  { label: '오각형', n: 5 },
  { label: '육각형', n: 6 },
];

const DEFAULT_RADIUS_KM = 0.2;

export default function FestivalZonePickerScreen() {
  const req = getZonePickRequest();
  const centerLat = req?.centerLat ?? 36.991;
  const centerLng = req?.centerLng ?? 127.926;

  const [vertices, setVertices] = useState<ZoneVertex[]>(() => {
    if (req?.polygon && req.polygon.length >= 3) return req.polygon;
    return makeRegularPolygon(centerLat, centerLng, DEFAULT_RADIUS_KM, 4);
  });

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const mapRef = useRef<NaverMapViewRef>(null);

  const initialCamera = useMemo(() => ({
    latitude: centerLat,
    longitude: centerLng,
    zoom: 15,
  }), []);

  // 폴리곤 오버레이용 coords (닫힌 폴리곤: 첫 꼭짓점 마지막에 추가)
  const polygonCoords = useMemo(() => {
    if (vertices.length < 3) return [];
    const coords = vertices.map(v => ({ latitude: v.lat, longitude: v.lng }));
    return [...coords, coords[0]]; // 닫힌 폴리곤
  }, [vertices]);

  const handleTapMap = useCallback(
    (e: { latitude: number; longitude: number }) => {
      if (selectedIdx == null) return;
      setVertices(prev => {
        const next = [...prev];
        next[selectedIdx] = { lat: e.latitude, lng: e.longitude };
        return next;
      });
    },
    [selectedIdx]
  );

  const handleSelectVertex = useCallback((idx: number) => {
    setSelectedIdx(prev => (prev === idx ? null : idx));
  }, []);

  const handleAddVertex = useCallback(() => {
    setVertices(prev => {
      if (prev.length >= 10) {
        Alert.alert('최대 10개', '꼭짓점은 최대 10개까지 추가할 수 있습니다.');
        return prev;
      }
      // 선택된 꼭짓점과 다음 꼭짓점 사이 중간점에 추가
      const insertAfter = selectedIdx ?? prev.length - 1;
      const next = (insertAfter + 1) % prev.length;
      const midLat = (prev[insertAfter].lat + prev[next].lat) / 2;
      const midLng = (prev[insertAfter].lng + prev[next].lng) / 2;
      const newVerts = [...prev];
      newVerts.splice(insertAfter + 1, 0, { lat: midLat, lng: midLng });
      return newVerts;
    });
  }, [selectedIdx]);

  const handleRemoveVertex = useCallback(() => {
    if (selectedIdx == null) {
      Alert.alert('꼭짓점 선택', '먼저 제거할 꼭짓점을 탭하세요.');
      return;
    }
    if (vertices.length <= 3) {
      Alert.alert('최소 3개', '꼭짓점은 최소 3개가 있어야 합니다.');
      return;
    }
    setVertices(prev => prev.filter((_, i) => i !== selectedIdx));
    setSelectedIdx(null);
  }, [selectedIdx, vertices.length]);

  const handleReset = useCallback((n: number) => {
    setVertices(makeRegularPolygon(centerLat, centerLng, DEFAULT_RADIUS_KM, n));
    setSelectedIdx(null);
    mapRef.current?.animateCameraTo({
      latitude: centerLat,
      longitude: centerLng,
      zoom: 15,
      duration: 300,
      easing: 'EaseOut',
    });
  }, [centerLat, centerLng]);

  const handleConfirm = useCallback(() => {
    if (vertices.length < 3) {
      Alert.alert('오류', '꼭짓점이 3개 이상 있어야 합니다.');
      return;
    }
    setZonePickResult(vertices);
    clearZonePickRequest();
    router.back();
  }, [vertices]);

  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return (
      <View style={styles.centered}>
        <Text style={styles.fallbackText}>지도는 Android / iOS 앱에서만 사용할 수 있습니다.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 안내 배너 */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoText}>
          {selectedIdx != null
            ? `꼭짓점 ${selectedIdx + 1} 선택됨 — 지도를 탭하면 해당 꼭짓점이 이동합니다`
            : '꼭짓점 마커를 탭해서 선택한 뒤 지도를 탭해 이동하세요'}
        </Text>
      </View>

      {/* 지도 */}
      <View style={{ height: MAP_HEIGHT }}>
        <NaverMapView
          ref={mapRef}
          style={styles.map}
          mapType="Basic"
          isShowScaleBar={false}
          isShowZoomControls={true}
          isShowLocationButton={false}
          initialCamera={initialCamera}
          onTapMap={handleTapMap}
        >
          {/* 폴리곤 영역 */}
          {polygonCoords.length >= 4 && (
            <NaverMapPolygonOverlay
              coords={polygonCoords}
              color="rgba(76, 139, 245, 0.2)"
              outlineWidth={2}
              outlineColor="rgba(76, 139, 245, 0.8)"
              zIndex={3}
            />
          )}

          {/* 중심 마커 */}
          <NaverMapMarkerOverlay
            latitude={centerLat}
            longitude={centerLng}
            image={{ symbol: 'red' }}
            anchor={{ x: 0.5, y: 1 }}
            zIndex={5}
          />

          {/* 꼭짓점 마커들 */}
          {vertices.map((v, idx) => (
            <NaverMapMarkerOverlay
              key={`v-${idx}`}
              latitude={v.lat}
              longitude={v.lng}
              width={32}
              height={32}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={10}
              caption={{
                text: String(idx + 1),
                textSize: 11,
                color: selectedIdx === idx ? '#7C3AED' : '#1D4ED8',
                haloColor: '#FFFFFF',
              }}
              image={
                selectedIdx === idx
                  ? { symbol: 'green' }
                  : { symbol: 'blue' }
              }
              onTap={() => handleSelectVertex(idx)}
            />
          ))}
        </NaverMapView>
      </View>

      {/* 하단 컨트롤 */}
      <ScrollView style={styles.footer} contentContainerStyle={styles.footerContent}>
        {/* 초기화 프리셋 */}
        <Text style={styles.sectionLabel}>초기화 (도형 선택)</Text>
        <View style={styles.presetRow}>
          {PRESET_SHAPES.map(p => (
            <TouchableOpacity
              key={p.n}
              style={styles.presetBtn}
              onPress={() => handleReset(p.n)}
              activeOpacity={0.7}
            >
              <Text style={styles.presetBtnText}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 꼭짓점 추가/제거 */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleAddVertex} activeOpacity={0.8}>
            <Text style={styles.actionBtnText}>+ 꼭짓점 추가</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={handleRemoveVertex}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>— 꼭짓점 제거</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.vertexCount}>꼭짓점 수: {vertices.length}개</Text>

        {/* 저장 버튼 */}
        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} activeOpacity={0.85}>
          <Text style={styles.confirmBtnText}>이 구역으로 설정</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  infoBanner: {
    backgroundColor: '#EEF4FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
  },
  infoText: { fontSize: 13, color: '#1D4ED8', textAlign: 'center' },
  map: { width: '100%', height: '100%' },
  footer: { flex: 1, backgroundColor: '#fff' },
  footerContent: { padding: 16, paddingBottom: 32 },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 8 },
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  presetBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  presetBtnText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  actionRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#4C8BF5',
    alignItems: 'center',
  },
  actionBtnDanger: { backgroundColor: '#EF4444' },
  actionBtnText: { fontSize: 14, color: '#fff', fontWeight: '500' },
  vertexCount: { fontSize: 12, color: '#9CA3AF', marginBottom: 12, textAlign: 'center' },
  confirmBtn: {
    backgroundColor: '#4C8BF5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  fallbackText: { fontSize: 14, color: '#6B7280' },
});
