import { useEffect } from "react";
import { Stack } from "expo-router";
import { getUserId, setUserId } from "@/services/chat.service";

export default function RootLayout() {
  useEffect(() => {
    (async () => {
      const uid = await getUserId();
      if (!uid) {
        await setUserId("1"); // ✅ 개발용 기본값
        console.log("✅ Default X-User-Id set to 1");
      } else {
        console.log("✅ Existing X-User-Id =", uid);
      }
    })();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false, // ✅ index / [id] 헤더 전부 숨김
      }}
    />
  );
}
