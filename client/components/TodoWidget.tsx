import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { TodoItem } from "@/types";

interface TodoWidgetProps {
  items: TodoItem[];
  onItemPress?: (item: TodoItem) => void;
}

export function TodoWidget({ items, onItemPress }: TodoWidgetProps) {
  const { theme } = useTheme();

  const getItemColor = (type: TodoItem["type"]) => {
    switch (type) {
      case "sla_breach":
        return theme.error;
      case "urgent":
        return theme.warning;
      default:
        return theme.primary;
    }
  };

  const getItemIcon = (type: TodoItem["type"]): keyof typeof Feather.glyphMap => {
    switch (type) {
      case "sla_breach":
        return "alert-circle";
      case "urgent":
        return "clock";
      default:
        return "check-circle";
    }
  };

  if (items.length === 0) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.surface }]}
      >
        <View style={styles.header}>
          <Feather name="check-square" size={18} color={theme.primary} />
          <ThemedText type="h4" style={styles.headerTitle}>
            Smart To-Do
          </ThemedText>
        </View>
        <View style={styles.emptyState}>
          <Feather name="check-circle" size={32} color={theme.success} />
          <ThemedText
            style={[styles.emptyText, { color: theme.textSecondary }]}
          >
            All caught up!
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <Feather name="check-square" size={18} color={theme.primary} />
        <ThemedText type="h4" style={styles.headerTitle}>
          Smart To-Do
        </ThemedText>
        <View
          style={[styles.countBadge, { backgroundColor: theme.primary + "15" }]}
        >
          <ThemedText style={[styles.countText, { color: theme.primary }]}>
            {items.length}
          </ThemedText>
        </View>
      </View>
      <View style={styles.itemsContainer}>
        {items.map((item, index) => {
          const color = getItemColor(item.type);
          const icon = getItemIcon(item.type);

          return (
            <Pressable
              key={item.id}
              onPress={() => onItemPress?.(item)}
              style={({ pressed }) => [
                styles.item,
                {
                  backgroundColor: pressed
                    ? theme.backgroundSecondary
                    : "transparent",
                  borderLeftColor: color,
                },
                index < items.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.itemIcon,
                  { backgroundColor: color + "15" },
                ]}
              >
                <Feather name={icon} size={16} color={color} />
              </View>
              <View style={styles.itemContent}>
                <ThemedText type="small" style={styles.itemTitle}>
                  {item.title}
                </ThemedText>
                <ThemedText
                  style={[styles.itemDescription, { color: theme.textMuted }]}
                >
                  {item.description}
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={18} color={theme.textMuted} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    ...Shadows.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    minWidth: 24,
    alignItems: "center",
  },
  countText: {
    fontSize: 12,
    fontWeight: "600",
  },
  itemsContainer: {},
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderLeftWidth: 3,
    gap: Spacing.md,
  },
  itemIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontWeight: "500",
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: 14,
  },
});
