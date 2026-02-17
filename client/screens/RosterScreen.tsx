import React, { useState, useMemo, useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, RefreshControl } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Spacing, BorderRadius } from "@/constants/theme";

type RosterRouteProp = RouteProp<RootStackParamList, "Roster">;

type ViewMode = "daily" | "weekly" | "biweekly" | "monthly" | "semimonthly";

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: "daily", label: "Day" },
  { value: "weekly", label: "Week" },
  { value: "biweekly", label: "2 Weeks" },
  { value: "monthly", label: "Month" },
  { value: "semimonthly", label: "Semi-Mo" },
];

interface RosterItem {
  id?: string;
  seriesId?: string;
  date: string;
  startTime: string;
  endTime: string | null;
  title: string;
  workerUserId: string | null;
  workerName: string | null;
  category: string;
  status: string;
  type: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  hotel: "#6366f1",
  banquet: "#f59e0b",
  janitorial: "#10b981",
};

function getDateRange(viewMode: ViewMode, cursor: Date): { startDate: string; endDate: string } {
  const d = new Date(cursor);
  d.setHours(0, 0, 0, 0);
  
  const fmt = (dt: Date) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  switch (viewMode) {
    case "daily":
      return { startDate: fmt(d), endDate: fmt(d) };
    case "weekly": {
      const dayOfWeek = d.getDay();
      const start = new Date(d);
      start.setDate(d.getDate() - dayOfWeek);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { startDate: fmt(start), endDate: fmt(end) };
    }
    case "biweekly": {
      const dayOfWeek2 = d.getDay();
      const start = new Date(d);
      start.setDate(d.getDate() - dayOfWeek2);
      const end = new Date(start);
      end.setDate(start.getDate() + 13);
      return { startDate: fmt(start), endDate: fmt(end) };
    }
    case "monthly": {
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return { startDate: fmt(start), endDate: fmt(end) };
    }
    case "semimonthly": {
      if (d.getDate() <= 15) {
        const start = new Date(d.getFullYear(), d.getMonth(), 1);
        const end = new Date(d.getFullYear(), d.getMonth(), 15);
        return { startDate: fmt(start), endDate: fmt(end) };
      } else {
        const start = new Date(d.getFullYear(), d.getMonth(), 16);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        return { startDate: fmt(start), endDate: fmt(end) };
      }
    }
  }
}

function navigateCursor(viewMode: ViewMode, cursor: Date, direction: number): Date {
  const d = new Date(cursor);
  switch (viewMode) {
    case "daily":
      d.setDate(d.getDate() + direction);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7 * direction);
      break;
    case "biweekly":
      d.setDate(d.getDate() + 14 * direction);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + direction);
      break;
    case "semimonthly":
      if (direction > 0) {
        if (d.getDate() <= 15) d.setDate(16);
        else { d.setMonth(d.getMonth() + 1); d.setDate(1); }
      } else {
        if (d.getDate() > 15) d.setDate(1);
        else { d.setMonth(d.getMonth() - 1); d.setDate(16); }
      }
      break;
  }
  return d;
}

function formatPeriodLabel(viewMode: ViewMode, startDate: string, endDate: string): string {
  const s = new Date(startDate + "T00:00:00");
  const e = new Date(endDate + "T00:00:00");
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  
  if (viewMode === "daily") {
    return s.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }
  
  const sStr = s.toLocaleDateString("en-US", opts);
  const eStr = e.toLocaleDateString("en-US", { ...opts, year: "numeric" });
  return `${sStr} - ${eStr}`;
}

export default function RosterScreen() {
  const route = useRoute<RosterRouteProp>();
  const { workplaceId, workplaceName } = route.params;
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [viewMode, setViewMode] = useState<ViewMode>("weekly");
  const [cursor, setCursor] = useState(new Date());

  const { startDate, endDate } = useMemo(() => getDateRange(viewMode, cursor), [viewMode, cursor]);

  const { data: rosterItems = [], isLoading, refetch } = useQuery<RosterItem[]>({
    queryKey: [`/api/roster?workplaceId=${workplaceId}&startDate=${startDate}&endDate=${endDate}`],
  });

  const groupedByDate = useMemo(() => {
    const groups: Record<string, RosterItem[]> = {};
    rosterItems.forEach((item) => {
      if (!groups[item.date]) groups[item.date] = [];
      groups[item.date].push(item);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [rosterItems]);

  const handlePrev = useCallback(() => {
    setCursor((prev) => navigateCursor(viewMode, prev, -1));
  }, [viewMode]);

  const handleNext = useCallback(() => {
    setCursor((prev) => navigateCursor(viewMode, prev, 1));
  }, [viewMode]);

  const handleToday = useCallback(() => {
    setCursor(new Date());
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{ paddingTop: headerHeight + Spacing.sm, paddingBottom: insets.bottom + Spacing.xl, paddingHorizontal: Spacing.lg }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        <ThemedText type="h3" style={{ marginBottom: Spacing.xs }}>{workplaceName}</ThemedText>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {VIEW_MODES.map((mode) => (
              <Pressable
                key={mode.value}
                onPress={() => setViewMode(mode.value)}
                style={[
                  styles.modeTab,
                  {
                    backgroundColor: viewMode === mode.value ? theme.primary : theme.backgroundSecondary,
                    borderColor: viewMode === mode.value ? theme.primary : theme.border,
                  },
                ]}
                testID={`tab-${mode.value}`}
              >
                <ThemedText style={{ fontSize: 12, fontWeight: "600", color: viewMode === mode.value ? "#fff" : theme.textSecondary }}>
                  {mode.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={styles.navRow}>
          <Pressable onPress={handlePrev} style={styles.navButton} testID="button-prev-period">
            <Feather name="chevron-left" size={20} color={theme.text} />
          </Pressable>
          <Pressable onPress={handleToday} style={{ flex: 1, alignItems: "center" }}>
            <ThemedText style={{ fontSize: 14, fontWeight: "600" }}>
              {formatPeriodLabel(viewMode, startDate, endDate)}
            </ThemedText>
          </Pressable>
          <Pressable onPress={handleNext} style={styles.navButton} testID="button-next-period">
            <Feather name="chevron-right" size={20} color={theme.text} />
          </Pressable>
        </View>

        {rosterItems.length === 0 && !isLoading ? (
          <Card style={styles.emptyCard}>
            <Feather name="calendar" size={32} color={theme.textSecondary} />
            <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>No shifts in this period</ThemedText>
          </Card>
        ) : null}

        {groupedByDate.map(([date, items]) => (
          <View key={date} style={{ marginBottom: Spacing.lg }}>
            <ThemedText style={[styles.dateHeader, { color: theme.primary }]}>
              {new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </ThemedText>
            {items.map((item, idx) => (
              <Card key={`${item.id || item.seriesId}-${idx}`} style={styles.rosterCard}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontSize: 15, fontWeight: "600" }}>{item.title}</ThemedText>
                    <ThemedText style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>
                      {item.startTime}{item.endTime ? ` - ${item.endTime}` : " (Open)"}
                    </ThemedText>
                  </View>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {item.category ? (
                      <View style={[styles.badge, { backgroundColor: (CATEGORY_COLORS[item.category] || "#6b7280") + "20" }]}>
                        <ThemedText style={{ fontSize: 10, fontWeight: "600", color: CATEGORY_COLORS[item.category] || "#6b7280" }}>
                          {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                        </ThemedText>
                      </View>
                    ) : null}
                    <View style={[styles.badge, { backgroundColor: item.type === "series_occurrence" ? "#8b5cf620" : theme.primary + "15" }]}>
                      <Feather
                        name={item.type === "series_occurrence" ? "repeat" : "calendar"}
                        size={10}
                        color={item.type === "series_occurrence" ? "#8b5cf6" : theme.primary}
                        style={{ marginRight: 3 }}
                      />
                      <ThemedText style={{ fontSize: 10, fontWeight: "600", color: item.type === "series_occurrence" ? "#8b5cf6" : theme.primary }}>
                        {item.type === "series_occurrence" ? "Series" : "Shift"}
                      </ThemedText>
                    </View>
                  </View>
                </View>
                {item.workerName ? (
                  <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 }}>
                    <Feather name="user" size={12} color={theme.textSecondary} />
                    <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>{item.workerName}</ThemedText>
                  </View>
                ) : null}
                {item.status === "cancelled" ? (
                  <View style={[styles.badge, { backgroundColor: "#ef444420", marginTop: 6, alignSelf: "flex-start" }]}>
                    <ThemedText style={{ fontSize: 10, fontWeight: "600", color: "#ef4444" }}>Cancelled</ThemedText>
                  </View>
                ) : null}
              </Card>
            ))}
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modeTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  navButton: {
    padding: 8,
    borderRadius: BorderRadius.md,
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    marginTop: Spacing.lg,
  },
  dateHeader: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rosterCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
});
