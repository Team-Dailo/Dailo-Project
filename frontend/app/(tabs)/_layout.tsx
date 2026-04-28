// app/(tabs)/_layout.tsx
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import {
  BackHandler,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TAB_ICONS = {
  home: require("../../assets/images/tab-home.png"),
  calendar: require("../../assets/images/tab-calendar.png"),
  map: require("../../assets/images/tab-map.png"),
  board: require("../../assets/images/tab-board.png"),
  mypage: require("../../assets/images/tab-mypage.png"),
};

const TAB_CONFIG = [
  { key: "home",    label: "홈",        icon: TAB_ICONS.home },
  { key: "calendar", label: "달력",     icon: TAB_ICONS.calendar },
  { key: "map",     label: "지도",      icon: TAB_ICONS.map },
  { key: "board",   label: "게시판",    icon: TAB_ICONS.board },
  { key: "mypage",  label: "마이페이지", icon: TAB_ICONS.mypage },
] as const;

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // TAB_CONFIG 순서를 유지하면서 실제 route만 매핑
  const tabs = TAB_CONFIG.map((config) => {
    const route = state.routes.find(
      (r) => r.name === config.key || r.name.startsWith(config.key + "/")
    );
    return route ? { config, route } : null;
  }).filter(Boolean) as { config: (typeof TAB_CONFIG)[number]; route: (typeof state.routes)[number] }[];

  const bottomPad = Platform.OS === 'ios' ? Math.max(insets.bottom - 12, 4) : insets.bottom;
  return (
    <View style={[styles.tabBar, { paddingBottom: bottomPad, height: 60 + bottomPad }]}>
      {tabs.map(({ config, route }) => {
        const routeIndex = state.routes.findIndex((r) => r.key === route.key);
        const isFocused = state.index === routeIndex;
        const color = isFocused ? "#565656" : "#A0A0A0";

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!event.defaultPrevented) {
            navigation.navigate(route.name as never);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            android_ripple={{ color: "transparent" }}
          >
            <Image
              source={config.icon}
              style={[styles.tabIcon, { tintColor: color }]}
              resizeMode="contain"
            />
            <Text style={[styles.tabLabel, { color }]}>{config.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
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
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="map" />
      <Tabs.Screen name="board" />
      <Tabs.Screen name="mypage" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    height: 60,
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5E5",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  tabIcon: {
    width: 24,
    height: 24,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
});
