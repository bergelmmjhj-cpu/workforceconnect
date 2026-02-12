import React, { useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/LoadingSkeleton";
import { Card } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useContentPadding } from "@/hooks/useContentPadding";
import { Spacing, BorderRadius } from "@/constants/theme";
import { APIShift, ShiftStatus } from "@/types";

const filterOptions: { label: string; value: ShiftStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Scheduled", value: "scheduled" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
];

function formatShiftDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const shiftDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((shiftDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";

  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTimeRange(start: string, end: string): string {
  return `${start} - ${end}`;
}

const statusBorderColors: Record<ShiftStatus, string> = {
  scheduled: "#3B82F6",
  in_progress: "#10B981",
  completed: "#64748B",
  cancelled: "#EF4444",
};

export default function ShiftsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();
  const { paddingTop } = useContentPadding();
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [filter, setFilter] = useState<ShiftStatus | "all">("all");

  const { data: shiftsData = [], isLoading, refetch, isRefetching } = useQuery<APIShift[]>({
    queryKey: ["/api/shifts"],
  });

  const filteredShifts =
    filter === "all"
      ? shiftsData
      : shiftsData.filter((s) => s.status === filter);

  const renderFilter = () => (
    <View style={[styles.filterContainer, { top: headerHeight }]}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={filterOptions}
        keyExtractor={(item) => item.value}
        contentContainerStyle={styles.filterContent}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              setFilter(item.value);
              Haptics.selectionAsync();
            }}
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  filter === item.value
                    ? theme.primary
                    : theme.backgroundSecondary,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.filterText,
                {
                  color:
                    filter === item.value ? "#fff" : theme.textSecondary,
                },
              ]}
            >
              {item.label}
            </ThemedText>
          </Pressable>
        )}
      />
    </View>
  );

  const renderShiftCard = ({ item }: { item: APIShift }) => {
    const borderColor = statusBorderColors[item.status as ShiftStatus] || "#6b7280";

    return (
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
        }}
        style={({ pressed }) => [
          styles.shiftCard,
          {
            backgroundColor: theme.surface,
            borderLeftColor: borderColor,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
        testID={`shift-card-${item.id}`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <ThemedText style={styles.shiftTitle} numberOfLines={1}>
              {item.title}
            </ThemedText>
            <StatusPill status={item.status as ShiftStatus} size="sm" />
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Feather name="calendar" size={14} color={theme.textMuted} />
            <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
              {formatShiftDate(item.date)}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Feather name="clock" size={14} color={theme.textMuted} />
            <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
              {formatTimeRange(item.startTime, item.endTime)}
            </ThemedText>
          </View>
          {item.workplaceName ? (
            <View style={styles.detailRow}>
              <Feather name="map-pin" size={14} color={theme.textMuted} />
              <ThemedText style={[styles.detailText, { color: theme.textSecondary }]} numberOfLines={1}>
                {item.workplaceName}
              </ThemedText>
            </View>
          ) : null}
        </View>

        {(user?.role === "admin" || user?.role === "hr") && item.workerName ? (
          <View style={styles.workerSection}>
            <Feather name="user" size={14} color={theme.textMuted} />
            <ThemedText style={[styles.workerText, { color: theme.textSecondary }]}>
              {item.workerName}
            </ThemedText>
          </View>
        ) : null}

        {item.notes ? (
          <View style={styles.notesSection}>
            <ThemedText style={[styles.notesText, { color: theme.textMuted }]} numberOfLines={2}>
              {item.notes}
            </ThemedText>
          </View>
        ) : null}
      </Pressable>
    );
  };

  const renderEmpty = () => (
    <EmptyState
      image={require("../../assets/images/empty-shifts.png")}
      title="No shifts found"
      description={
        user?.role === "worker"
          ? "You haven't been assigned to any shifts yet"
          : "No shifts match your current filter"
      }
    />
  );

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: paddingTop,
            paddingHorizontal: Spacing.lg,
          },
        ]}
      >
        <ListSkeleton count={4} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {renderFilter()}
      <FlatList
        data={filteredShifts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: paddingTop + Spacing["3xl"],
            paddingBottom: tabBarHeight + Spacing.xl,
          },
          filteredShifts.length === 0 ? styles.emptyContent : undefined,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.primary}
          />
        }
        renderItem={renderShiftCard}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
  },
  filterContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  emptyContent: {
    flexGrow: 1,
  },
  separator: {
    height: Spacing.md,
  },
  shiftCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderLeftWidth: 4,
  },
  cardHeader: {
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  shiftTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  cardDetails: {
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
  },
  workerSection: {
    marginTop: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  workerText: {
    fontSize: 13,
    flex: 1,
  },
  notesSection: {
    marginTop: Spacing.sm,
  },
  notesText: {
    fontSize: 12,
    fontStyle: "italic",
  },
});
