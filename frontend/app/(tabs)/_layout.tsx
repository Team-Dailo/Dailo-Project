// app/(tabs)/_layout.tsx
import React from "react";
import { Image, StyleSheet, Pressable } from "react-native";
import { Tabs } from "expo-router";
import { useNavigation } from "@react-navigation/native";

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

/** 마이페이지 탭: 탭을 누르면 항상 마이페이지 첫 화면(index)으로 보이도록 스택 초기화 (홈에서 알림설정 갔다가 뒤로 갔을 때 알림설정이 남는 문제 방지) */
function MypageTabButton(props: { onPress?: () => void; children: React.ReactNode; [key: string]: unknown }) {
  const navigation = useNavigation();
  const { onPress: defaultOnPress, ...rest } = props;
  const onPress = () => {
    (navigation as { navigate: (name: string, params?: object) => void }).navigate("mypage", { screen: "index" });
    defaultOnPress?.();
  };
  return <Pressable {...rest} onPress={onPress} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#565656",
        tabBarInactiveTintColor: "#A0A0A0",
        tabBarStyle: {
          height: 72,
          paddingTop: 10,
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
        }}
      />
      <Tabs.Screen
        name="calendar/index"
        options={{
          title: "달력",
          tabBarIcon: ({ color, size }) => (
            <TabIcon source={TAB_ICONS.calendar} color={color} size={size} />
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
        }}
      />
      <Tabs.Screen
        name="board/index"
        options={{
          title: "게시판",
          tabBarIcon: ({ color, size }) => (
            <TabIcon source={TAB_ICONS.board} color={color} size={size} />
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
          tabBarButton: (props) => <MypageTabButton {...props} />,
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
