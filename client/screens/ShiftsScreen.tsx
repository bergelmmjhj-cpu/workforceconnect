import React, { useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation } from "@tanstack/react-query";

import { apiRequest, queryClient } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/LoadingSkeleton";
import { Card } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useContentPadding } from "@/hooks/useContentPadding";
import { Spacing, BorderRadius } from "@/constants/theme";
import { APIShift, ShiftStatus, ShiftFrequency, ShiftCategory } from "@/types";

const categoryColors: Record<ShiftCategory, string> = {
  hotel: "#7C3AED",
  banquet: "#D97706",
  janitorial: "#059669",
};

const categoryLabels: Record<ShiftCategory, string> = {
  hotel: "Hotel",
  banquet: "Banquet",
  janitorial: "Janitorial",
};

const frequencyIcons: Record<ShiftFrequency, string> = {
  "one-time": "calendar",
  "recurring": "repeat",
  "open-ended": "clock",
};

const frequencyLabels: Record<ShiftFrequency, string> = {
  "one-time": "One-Time",
  "recurring": "Recurring",
  "open-ended": "Open-Ended",
};

const dayAbbreviations: Record<string, string> = {
  sunday: "Sun",
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
};

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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const { data: shiftsData = [], isLoading, refetch, isRefetching } = useQuery<APIShift[]>({
    queryKey: ["/api/shifts"],
    refetchInterval: 30000,
  });

  const filteredShifts =
    filter === "all"
      ? shiftsData
      : shiftsData.filter((s) => s.status === filter);

  const deleteShiftMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      const res = await apiRequest("DELETE", `/api/shifts/${shiftId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      setDeleteTarget(null);
    },
    onError: () => {
      setDeleteTarget(null);
    },
  });

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
          if (user?.role === "worker" && item.workerUserId === user.id) {
            navigation.navigate("ClockInOut", { shiftId: item.id });
          }
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
              {formatTimeRange(item.startTime, item.endTime || "TBD")}
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

        {user?.role === "worker" ? (
          <View style={styles.contextSection}>
            {(() => {
              const now = new Date();
              const shiftDateStr = item.date + "T" + item.startTime + ":00";
              const shiftStart = new Date(shiftDateStr);
              const endStr = item.endTime ? item.date + "T" + item.endTime + ":00" : null;
              const shiftEnd = endStr ? new Date(endStr) : null;
              const diffMs = shiftStart.getTime() - now.getTime();
              const diffMin = Math.round(diffMs / 60000);
              
              if (item.status === "completed") {
                return (
                  <View style={[styles.contextBadge, { backgroundColor: "#64748B20" }]}>
                    <Feather name="check-circle" size={14} color="#64748B" />
                    <ThemedText style={[styles.contextText, { color: "#64748B" }]}>Completed</ThemedText>
                  </View>
                );
              }
              if (item.status === "cancelled") {
                return (
                  <View style={[styles.contextBadge, { backgroundColor: "#EF444420" }]}>
                    <Feather name="x-circle" size={14} color="#EF4444" />
                    <ThemedText style={[styles.contextText, { color: "#EF4444" }]}>Cancelled</ThemedText>
                  </View>
                );
              }
              if (item.status === "in_progress") {
                return (
                  <View style={[styles.contextBadge, { backgroundColor: "#10B98120" }]}>
                    <Feather name="activity" size={14} color="#10B981" />
                    <ThemedText style={[styles.contextText, { color: "#10B981" }]}>In Progress</ThemedText>
                  </View>
                );
              }
              if (diffMin > 60) {
                const hours = Math.floor(diffMin / 60);
                const mins = diffMin % 60;
                return (
                  <View style={[styles.contextBadge, { backgroundColor: "#3B82F620" }]}>
                    <Feather name="clock" size={14} color="#3B82F6" />
                    <ThemedText style={[styles.contextText, { color: "#3B82F6" }]}>
                      {hours > 0 ? `Starts in ${hours}h ${mins > 0 ? `${mins}m` : ""}` : `Starts in ${mins}m`}
                    </ThemedText>
                  </View>
                );
              }
              if (diffMin > 15) {
                return (
                  <View style={[styles.contextBadge, { backgroundColor: "#F59E0B20" }]}>
                    <Feather name="clock" size={14} color="#F59E0B" />
                    <ThemedText style={[styles.contextText, { color: "#F59E0B" }]}>Starts in {diffMin}m</ThemedText>
                  </View>
                );
              }
              if (diffMin > -15) {
                return (
                  <Pressable
                    onPress={() => navigation.navigate("ClockInOut", { shiftId: item.id })}
                    style={[styles.clockInButton, { backgroundColor: "#10B981" }]}
                    testID={`button-clockin-${item.id}`}
                  >
                    <Feather name="log-in" size={16} color="#FFFFFF" />
                    <ThemedText style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 14 }}>Clock In</ThemedText>
                  </Pressable>
                );
              }
              if (shiftEnd && now > shiftEnd) {
                return (
                  <View style={[styles.contextBadge, { backgroundColor: "#EF444420" }]}>
                    <Feather name="alert-circle" size={14} color="#EF4444" />
                    <ThemedText style={[styles.contextText, { color: "#EF4444" }]}>Shift Ended</ThemedText>
                  </View>
                );
              }
              return (
                <View style={[styles.contextBadge, { backgroundColor: "#F59E0B20" }]}>
                  <Feather name="alert-triangle" size={14} color="#F59E0B" />
                  <ThemedText style={[styles.contextText, { color: "#F59E0B" }]}>Late - Clock In Now</ThemedText>
                </View>
              );
            })()}
          </View>
        ) : null}

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

        {(user?.role === "admin" || user?.role === "hr") ? (
          <View style={[styles.deleteRow, { borderTopColor: theme.border }]}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setDeleteTarget({ id: item.id, title: item.title });
              }}
              style={styles.deleteButton}
              testID={`delete-shift-${item.id}`}
            >
              <Feather name="trash-2" size={14} color="#EF4444" />
              <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
            </Pressable>
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
      <Modal
        visible={deleteTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setDeleteTarget(null)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}
            onPress={() => {}}
          >
            <ThemedText type="h4" style={styles.modalTitle}>Delete Shift</ThemedText>
            <ThemedText style={[styles.modalMessage, { color: theme.textSecondary }]}>
              Are you sure you want to delete "{deleteTarget?.title}"? This will also remove all associated offers and check-ins.
            </ThemedText>
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setDeleteTarget(null)}
                style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <ThemedText style={{ color: theme.text, fontWeight: "600" }}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (deleteTarget) {
                    deleteShiftMutation.mutate(deleteTarget.id);
                  }
                }}
                disabled={deleteShiftMutation.isPending}
                style={[styles.modalButton, { backgroundColor: "#EF4444" }]}
              >
                {deleteShiftMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={{ color: "#fff", fontWeight: "600" }}>Delete</ThemedText>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  deleteRow: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  deleteButtonText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: "100%",
    maxWidth: 340,
  },
  modalTitle: {
    marginBottom: Spacing.md,
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  contextSection: {
    marginTop: Spacing.md,
  },
  contextBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    alignSelf: "flex-start",
  },
  contextText: {
    fontSize: 13,
    fontWeight: "600",
  },
  clockInButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.md,
  },
});
