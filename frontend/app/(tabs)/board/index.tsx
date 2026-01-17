import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function BoardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>게시판 탭</Text>
      <Text>게시판 목록, 글 상세, 글쓰기 화면이 여기에서 파생될 거예요.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
  },
});
