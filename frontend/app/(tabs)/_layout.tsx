// app/(tabs)/_layout.tsx
import React, { useEffect } from "react";
import { Image, StyleSheet, Pressable, Platform, BackHandler, View, Text } from "react-native";
import { Tabs, router } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

const TAB_ICONS = {
  home: require("../../assets/images/tab-home.png"),
  calendar: require("../../assets/images/tab-calendar.png"),
  map: require("../../assets/images/tab-map.png"),
  board: require("../../assets/images/tab-board.png"),
  mypage: require("../../assets/images/tab-mypage.png"),
};

const MAIN_TAB_ROUTE_NAMES = [
  "home",
  "calendar/index",
  "map/index",
  "board/index",
  "mypage",
] as const;

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

type CustomTabBarProps = BottomTabBarProps & {
  bottomInset: number;
  tabBarHeight: number;
};

function CustomTabBar({ state, descriptors, navigation, bottomInset, tabBarHeight }: CustomTabBarProps) {
  const firstRoute = state.routes[0];
  const baseOptions = firstRoute ? descriptors[firstRoute.key].options : {};
  const activeColor = baseOptions.tabBarActiveTintColor ?? "#565656";
  const inactiveColor = baseOptions.tabBarInactiveTintColor ?? "#A0A0A0";

  return (
    <View
      style={[
        styles.customTabBar,
        { height: tabBarHeight + bottomInset, paddingBottom: bottomInset },
      ]}
    >
      {MAIN_TAB_ROUTE_NAMES.map((name) => {
        const routeIndex = state.routes.findIndex((r) => r.name === name);
        if (routeIndex === -1) return null;
        const route = state.routes[routeIndex];
        const descriptor = descriptors[route.key];
        const isFocused = state.index === routeIndex;
        const color = isFocused ? activeColor : inactiveColor;
        const tabBarIcon = descriptor.options.tabBarIcon;
        const labelOption = descriptor.options.tabBarLabel;
        const title = descriptor.options.title;
        const label =
          typeof labelOption === "string"
            ? labelOption
            : typeof title === "string"
            ? title
            : route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name as never, route.params as never);
          }
        };

        return (
          <Pressable key={route.key} style={styles.customTabItem} onPress={onPress}>
            {typeof tabBarIcon === "function"
              ? tabBarIcon({ focused: isFocused, color, size: 24 })
              : null}
            <Text style={[styles.customTabLabel, { color }]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
      const state = navigation.getState();
      const currentTab = state?.routes?.[state.index];
      const nestedState = currentTab?.state as { index?: number; routes?: unknown[] } | undefined;
      const isAtTabRoot =
        !nestedState ||
        typeof nestedState.index !== "number" ||
        nestedState.index <= 0;
      if (isAtTabRoot) {
        BackHandler.exitApp();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [navigation]);

  // 하단 시스템 네비게이션 바 높이만큼만 안전 영역을 적용 (강제 여백 X)
  const bottomInset = insets.bottom ?? 0;
  return (
    <Tabs
      tabBar={(props) => (
        <CustomTabBar
          {...props}
          bottomInset={bottomInset}
          tabBarHeight={tabBarHeight}
        />
      )}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#565656",
        tabBarInactiveTintColor: "#A0A0A0",
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
  customTabBar: {
    flexDirection: "row",
    borderTopColor: "#E5E5E5",
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: "#FFFFFF",
  },
  customTabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
  },
  customTabLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});
