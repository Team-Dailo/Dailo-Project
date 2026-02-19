// app/(tabs)/_layout.tsx
import React, { useEffect } from "react";
import { Image, StyleSheet, Pressable, Platform, BackHandler } from "react-native";
import { Tabs, router } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_ICONS = {
  home: require("../../assets/images/tab-home.png"),
  calendar: require("../../assets/images/tab-calendar.png"),
  map: require("../../assets/images/tab-map.png"),
  board: require("../../assets/images/tab-board.png"),
  mypage: require("../../assets/images/tab-mypage.png"),
};

function TabIcon({
  source,
  color,
  size,
}: {
  source: number;
  color: string;
  size: number;
}) {
  return (
    <Image
      source={source}
      style={[styles.tabIcon, { width: size, height: size, tintColor: color }]}
      resizeMode="contain"
    />
  );
}

/** 탭 아이콘을 눌렀을 때 항상 해당 탭의 루트 화면으로 이동시키는 버튼 */
function RootTabButton(
  props: {
    target: string;
    params?: object;
    onPress?: () => void;
    children: React.ReactNode;
    [key: string]: unknown;
  }
) {
  const navigation = useNavigation();
  const { target, params, onPress: defaultOnPress, ...rest } = props;
  const onPress = () => {
    (navigation as { navigate: (name: string, params?: object) => void }).navigate(target, params);
    defaultOnPress?.();
  };
  return <Pressable {...(rest as any)} onPress={onPress} />;
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const tabBarHeight = 72;

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!navigation.canGoBack()) {
        router.replace("/(tabs)/home");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [navigation]);

  // 아이폰은 하단 버튼 없음 → 여백 최소, Android(삼성 등)는 네비 버튼과 겹치지 않도록 safe area 적용
  const bottomInset = Platform.OS === "ios" ? 0 : Math.max(insets.bottom ?? 0, 24);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#565656",
        tabBarInactiveTintColor: "#A0A0A0",
        tabBarStyle: {
          height: tabBarHeight + bottomInset,
          paddingTop: 10,
          paddingBottom: bottomInset,
          borderTopColor: "#E5E5E5",
        },
        tabBarLabelStyle: {
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "홈",
          tabBarIcon: ({ color, size }) => (
            <TabIcon source={TAB_ICONS.home} color={color} size={size} />
          ),
          tabBarButton: (props) => (
            <RootTabButton {...props} target="home" />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar/index"
        options={{
          title: "달력",
          tabBarIcon: ({ color, size }) => (
            <TabIcon source={TAB_ICONS.calendar} color={color} size={size} />
          ),
          tabBarButton: (props) => (
            <RootTabButton {...props} target="calendar/index" />
          ),
        }}
      />
      <Tabs.Screen
        name="map/index"
        options={{
          title: "지도",
          tabBarIcon: ({ color, size }) => (
            <TabIcon source={TAB_ICONS.map} color={color} size={size} />
          ),
          tabBarButton: (props) => (
            <RootTabButton {...props} target="map/index" />
          ),
        }}
      />
      <Tabs.Screen
        name="board/index"
        options={{
          title: "게시판",
          tabBarIcon: ({ color, size }) => (
            <TabIcon source={TAB_ICONS.board} color={color} size={size} />
          ),
          tabBarButton: (props) => (
            <RootTabButton {...props} target="board/index" />
          ),
        }}
      />
      <Tabs.Screen
        name="mypage"
        options={{
          title: "마이페이지",
          tabBarIcon: ({ color, size }) => (
            <TabIcon source={TAB_ICONS.mypage} color={color} size={size} />
          ),
          tabBarButton: (props) => (
            <RootTabButton {...props} target="mypage" params={{ screen: "index" }} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: 24,
    height: 24,
  },
});
