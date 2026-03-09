import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Feather.glyphMap;
  color?: string;
  trend?: {
    value: number;
    isUp: boolean;
  };
  onPress?: () => void;
}

export function StatCard({
  title,
  value,
  icon,
  color,
  trend,
  onPress,
}: StatCardProps) {
  const { theme } = useTheme();
  const iconColor = color || theme.primary;

  const content = (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surface,
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconColor + "15" }]}>
        <Feather name={icon} size={16} color={iconColor} />
      </View>
      <ThemedText style={[styles.title, { color: theme.textSecondary }]}>
        {title}
      </ThemedText>
      <View style={styles.valueRow}>
        <ThemedText type="h2" style={styles.value}>
          {value}
        </ThemedText>
        {trend ? (
          <View
            style={[
              styles.trendBadge,
              {
                backgroundColor: trend.isUp
                  ? theme.success + "15"
                  : theme.error + "15",
              },
            ]}
          >
            <Feather
              name={trend.isUp ? "trending-up" : "trending-down"}
              size={12}
              color={trend.isUp ? theme.success : theme.error}
            />
            <ThemedText
              style={[
                styles.trendText,
                { color: trend.isUp ? theme.success : theme.error },
              ]}
            >
              {trend.value}%
            </ThemedText>
          </View>
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    minHeight: 88,
    ...Shadows.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  value: {
    fontWeight: "700",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  trendText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
