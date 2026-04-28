// app/(tabs)/_layout.tsx
import { useNavigation } from "@react-navigation/native";
import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import {
  BackHandler,
  Image,
  Platform,
  Pressable,
  StyleSheet,
} from "react-native";

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
      style={{ width: size, height: size, tintColor: color }}
      resizeMode="contain"
    />
  );
}

/** 탭 아이콘을 눌렀을 때 항상 해당 탭의 루트 화면으로 이동시키는 버튼 */
function RootTabButton(props: {
  target: string;
  params?: object;
  onPress?: (e?: any) => void;
  children: React.ReactNode;
  [key: string]: unknown;
}) {
  const navigation = useNavigation();
  const { target, params, onPress: defaultOnPress, ...rest } = props;
  const onPress = () => {
    (
      navigation as { navigate: (name: string, params?: object) => void }
    ).navigate(target, params);
    defaultOnPress?.();
  };
  return <Pressable {...(rest as any)} onPress={onPress} />;
}

export default function TabsLayout() {
  const navigation = useNavigation();

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      const state = navigation.getState();
      const currentTab = state?.routes?.[state.index];
      const nestedState = currentTab?.state as
        | { index?: number; routes?: unknown[] }
        | undefined;
      const isAtTabRoot =
        !nestedState ||
        typeof nestedState.index !== "number" ||
        nestedState.index <= 0;
      if (isAtTabRoot) {
        BackHandler.exitApp();
        return true;
      }
      if (navigation.canGoBack()) {
        navigation.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [navigation]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#565656",
        tabBarInactiveTintColor: "#A0A0A0",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "홈",
          tabBarIcon: ({ color, size }) => (
            <TabIcon source={TAB_ICONS.home} color={color} size={size} />
          ),
          tabBarButton: (props) => <RootTabButton {...props} target="home" />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "달력",
          tabBarIcon: ({ color, size }) => (
            <TabIcon source={TAB_ICONS.calendar} color={color} size={size} />
          ),
          tabBarButton: (props) => (
            <RootTabButton {...props} target="calendar" />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "지도",
          tabBarIcon: ({ color, size }) => (
            <TabIcon source={TAB_ICONS.map} color={color} size={size} />
          ),
          tabBarButton: (props) => (
            <RootTabButton {...props} target="map" />
          ),
        }}
      />
      <Tabs.Screen
        name="board"
        options={{
          title: "게시판",
          tabBarIcon: ({ color, size }) => (
            <TabIcon source={TAB_ICONS.board} color={color} size={size} />
          ),
          tabBarButton: (props) => (
            <RootTabButton {...props} target="board" />
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
            <RootTabButton
              {...props}
              target="mypage"
              params={{ screen: "index" }}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 60,
    backgroundColor: "#FFFFFF",
    borderTopColor: "#E5E5E5",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
    marginBottom: 2,
  },
});
