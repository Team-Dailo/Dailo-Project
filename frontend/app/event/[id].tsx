// frontend/app/event/[id].tsx
import React, { useState, useRef } from "react";
import { ScrollView, View, StyleSheet, Platform, ToastAndroid, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";

import EventDetailHeader from "../../components/detail/EventDetailHeader";
import { useEventDetail } from "../../hooks/useEvent";
import EventDetailTabs, { TabKey } from "../../components/detail/EventDetailTabs";
import Timeline from "../../components/detail/Timeline";
import EventNewsTab from "../../components/detail/EventNewsTab";
import EventBoothTab from "../../components/detail/EventBoothTab";

export default function EventDetailScreen() {
  const { id, source } = useLocalSearchParams<{ id: string; source?: string }>();
  const { detail: event, loading, error } = useEventDetail(id, source ?? "detail");

  const [tab, setTab] = useState<TabKey>("news");

  const scrollRef = useRef<any>(null);
  const [tabsOffsetY, setTabsOffsetY] = useState(0);

  const handleChangeTab = (key: TabKey) => {
    setTab(key);
    scrollRef.current?.scrollTo({ y: tabsOffsetY, animated: true });
  };

  const handleSave = () => {
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
      <EventDetailHeader
        id={id}
        event={event}
        loading={loading}
        error={error}
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
