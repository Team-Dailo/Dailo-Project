// frontend/app/event/[id].tsx
import React, { useState, useRef } from "react";
import { ScrollView, View, StyleSheet, Share, Platform, ToastAndroid, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";

import EventDetailHeader from "../../components/detail/EventDetailHeader";
import EventDetailTabs, { TabKey } from "../../components/detail/EventDetailTabs";
import Timeline from "../../components/detail/Timeline";
import EventNewsTab from "../../components/detail/EventNewsTab";
import EventBoothTab from "../../components/detail/EventBoothTab";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [tab, setTab] = useState<TabKey>("news");

  const scrollRef = useRef<any>(null);
  const [tabsOffsetY, setTabsOffsetY] = useState(0);

  const handleChangeTab = (key: TabKey) => {
    setTab(key);
    scrollRef.current?.scrollTo({ y: tabsOffsetY, animated: true });
  };

  // ✅ 1) 공유하기: OS 기본 공유 시트 띄우기
  const handleShare = async () => {
    try {
      // 공유할 링크/텍스트 (일단 예시)
      const url = `https://www.naver.com/`; 
      await Share.share({
        message: url, // Android에선 message가 안전
        url,          // iOS에서 url도 같이 넣으면 좋음
        title: "축제 공유하기",
      });
    } catch (e) {
      // 취소해도 에러로 잡히는 경우가 있어 조용히 무시해도 됩니다
      console.log(e);
    }
  };

  // ✅ 2) 저장하기: "저장되었습니다" 안내
  const handleSave = () => {
    // TODO: 실제 저장 로직(서버 호출/로컬 상태)은 여기서 추가하면 됨
    if (Platform.OS === "android") {
      ToastAndroid.show("저장되었습니다", ToastAndroid.SHORT);
    } else {
      Alert.alert("저장되었습니다");
    }
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* 0. 상단 공통 헤더 */}
      <EventDetailHeader
        id={id}
        onShare={handleShare}
        onSave={handleSave}
      />

      {/* 1. 탭 영역 */}
      <View
        style={styles.tabsWrapper}
        onLayout={(e) => setTabsOffsetY(e.nativeEvent.layout.y)}
      >
        <EventDetailTabs value={tab} onChange={handleChangeTab} />
      </View>

      {/* 2. 탭별 내용 */}
      <View style={styles.body}>
        {tab === "news" && <EventNewsTab />}
        {tab === "timeline" && <Timeline />}
        {tab === "booths" && <EventBoothTab />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  contentContainer: { paddingBottom: 40, backgroundColor: "#ffffff" },
  tabsWrapper: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  body: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 },
});
