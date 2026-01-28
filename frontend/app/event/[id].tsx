// frontend/app/event/[id].tsx
import React, { useState, useRef } from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";

import EventDetailHeader from "../../components/detail/EventDetailHeader";
import EventDetailTabs, {
  TabKey,
} from "../../components/detail/EventDetailTabs";
import Timeline from "../../components/detail/Timeline";
import EventNewsTab from "../../components/detail/EventNewsTab";
import EventBoothTab from "../../components/detail/EventBoothTab";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [tab, setTab] = useState<TabKey>("news");

  // 🔹 ScrollView 참조 + 탭의 Y 위치 저장
  const scrollRef = useRef<any>(null);
  const [tabsOffsetY, setTabsOffsetY] = useState(0);

  // 🔹 탭 변경 시 탭이 화면 상단으로 오도록 스크롤
  const handleChangeTab = (key: TabKey) => {
    setTab(key);

    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        y: tabsOffsetY,
        animated: true,
      });
    }
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* 0. 상단 공통 헤더 */}
      <EventDetailHeader id={id} />

      {/* 1. 탭 영역 (소식 / 타임테이블 / 축제부스) */}
      <View
        style={styles.tabsWrapper}
        onLayout={(e) => {
          // 이 뷰의 Y값을 기억해뒀다가 탭 클릭 시 그 위치로 스크롤
          setTabsOffsetY(e.nativeEvent.layout.y);
        }}
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
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  contentContainer: {
    paddingBottom: 40,
    backgroundColor: "#ffffff",
  },
  tabsWrapper: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
});
