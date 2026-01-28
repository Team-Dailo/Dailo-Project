// app/(tabs)/home/_layout.tsx
import { Stack } from "expo-router";

export default function HomeLayout() {
  return (
    <Stack>
      {/* 홈 메인은 우리가 직접 헤더 만들었으니까 숨김 */}
      <Stack.Screen
        name="index"
        options={{ headerShown: false }}
      />
      {/* 행사 리스트 전체 화면 */}
      <Stack.Screen
        name="event-list"
        options={{ title: "행사 리스트" }}
      />
    </Stack>
  );
}
