import { View, Pressable, Text } from "react-native";

type TabKey = "news" | "timeline" | "booths";

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
            borderColor: "#007bff",
          }}
        >
          <Text
            style={{
              textAlign: "center",
              fontWeight: value === t.key ? "bold" as const : "normal",
            }}
          >
            {t.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
