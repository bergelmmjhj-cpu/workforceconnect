import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Spacing } from "@/constants/theme";

export default function ApplicationsAdminScreen() {
  const headerHeight = useHeaderHeight();
  const isWeb = Platform.OS === "web";

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.content, { paddingTop: isWeb ? Spacing.md : headerHeight + Spacing.lg }]}>
        <ThemedText type="h2">Worker Applications</ThemedText>
        <ThemedText>Review worker applications here.</ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
});
