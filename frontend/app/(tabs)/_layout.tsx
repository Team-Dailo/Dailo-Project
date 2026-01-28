// app/(tabs)/_layout.tsx
import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#222222",
        tabBarInactiveTintColor: "#A0A0A0",
        tabBarStyle: {
          height: 60,
          borderTopColor: "#E5E5E5",
        },
        tabBarLabelStyle: {
          fontSize: 10,
        },
      }}
    >
      {/* 홈 */}
      <Tabs.Screen
        name="home"
        options={{
          title: "홈",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />

      {/* 달력 */}
      <Tabs.Screen
        name="calendar/index"
        options={{
          title: "달력",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" color={color} size={size} />
          ),
        }}
      />

      {/* 지도 */}
      <Tabs.Screen
        name="map/index"
        options={{
          title: "지도",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" color={color} size={size} />
          ),
        }}
      />

      {/* 게시판 */}
      <Tabs.Screen
        name="board/index"
        options={{
          title: "게시판",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" color={color} size={size} />
          ),
        }}
      />

      {/* 마이페이지 */}
      <Tabs.Screen
        name="mypage"   // ✅ 여기!  "mypage/index" → "mypage"
        options={{
          title: "마이페이지",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
