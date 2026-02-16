import { View, Pressable, Text } from "react-native";

// 🔹 외부에서 import할 수 있도록 export 추가!
export type TabKey = "news" | "timeline" | "booths";

interface Props {
  value: TabKey;
  onChange: (key: TabKey) => void;
}

const tabs: { key: TabKey; label: string }[] = [
  { key: "news", label: "소식" },
  { key: "timeline", label: "타임테이블" },
  { key: "booths", label: "축제부스" },
];

export default function EventDetailTabs({ value, onChange }: Props) {
  return (
    <View
      style={{
        flexDirection: "row",
        borderBottomWidth: 1,
        borderColor: "#eee",
        backgroundColor: "#ffffff",
      }}
    >
      {tabs.map((t) => (
        <Pressable
          key={t.key}
          onPress={() => onChange(t.key)}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderBottomWidth: value === t.key ? 2 : 0,
            borderColor: "#4C8BF5", // 피그마 블루 느낌
          }}
        >
          <Text
            style={{
              textAlign: "center",
              fontWeight: value === t.key ? "600" : "400",
              color: value === t.key ? "#111" : "#666",
            }}
          >
            {t.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
