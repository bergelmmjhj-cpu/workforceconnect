import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/LoadingSkeleton";
import { Card } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useContentPadding } from "@/hooks/useContentPadding";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest, queryClient } from "@/lib/query-client";

type ShiftRequestStatus = "submitted" | "offered" | "filled" | "cancelled";

interface ShiftRequest {
  id: string;
  clientId: string;
  workplaceId: string;
  roleType: string;
  date: string;
  startTime: string;
  endTime: string;
  notes: string | null;
  requestedWorkerId: string | null;
  status: ShiftRequestStatus;
  createdAt: string;
  updatedAt: string;
  clientName: string;
  workplaceName: string;
  requestedWorkerName: string | null;
}

interface EligibleWorker {
  id: string;
  fullName: string;
  roleMatch: boolean;
  hasConflict: boolean;
}

interface EligibleWorkersResponse {
  eligibleWorkers: EligibleWorker[];
  totalActive: number;
  totalEligible: number;
  totalWithConflicts: number;
}

interface OfferCounts {
  total: number;
  pending: number;
  accepted: number;
  declined: number;
  expired: number;
  cancelled: number;
}

interface OffersResponse {
  offers: any[];
  counts: OfferCounts;
}

const filterOptions: { label: string; value: ShiftRequestStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Submitted", value: "submitted" },
  { label: "Offered", value: "offered" },
  { label: "Filled", value: "filled" },
  { label: "Cancelled", value: "cancelled" },
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

export default function ShiftRequestsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { paddingTop, paddingBottom } = useContentPadding();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();

  const [filter, setFilter] = useState<ShiftRequestStatus | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showWorkerPicker, setShowWorkerPicker] = useState<string | null>(null);

  const { data: requestsData = [], isLoading, refetch, isRefetching } = useQuery<ShiftRequest[]>({
    queryKey: ["/api/shift-requests"],
  });

  const filteredRequests =
    filter === "all"
      ? requestsData
      : requestsData.filter((r) => r.status === filter);

  const assignMutation = useMutation({
    mutationFn: async ({ requestId, workerId }: { requestId: string; workerId?: string }) => {
      const body: any = {};
      if (workerId) {
        body.workerId = workerId;
      }
      const res = await apiRequest("POST", `/api/shift-requests/${requestId}/assign`, body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-requests"] });
      setShowWorkerPicker(null);
      setExpandedId(null);
    },
  });

  const handleToggleExpand = useCallback((id: string) => {
    Haptics.selectionAsync();
    setExpandedId((prev) => (prev === id ? null : id));
    setShowWorkerPicker(null);
  }, []);

  const handleAssignWorker = useCallback((requestId: string) => {
    Haptics.selectionAsync();
    setShowWorkerPicker((prev) => (prev === requestId ? null : requestId));
  }, []);

  const handleBroadcast = useCallback((requestId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    assignMutation.mutate({ requestId });
  }, [assignMutation]);

  const handleSelectWorker = useCallback((requestId: string, workerId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    assignMutation.mutate({ requestId, workerId });
  }, [assignMutation]);

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
            testID={`filter-${item.value}`}
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

  const renderRequestCard = ({ item }: { item: ShiftRequest }) => {
    const isExpanded = expandedId === item.id;
    const isPickerOpen = showWorkerPicker === item.id;

    return (
      <Pressable
        onPress={() => handleToggleExpand(item.id)}
        style={({ pressed }) => [
          styles.requestCard,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: isExpanded ? theme.primary : theme.border,
            opacity: pressed ? 0.95 : 1,
          },
        ]}
        testID={`shift-request-card-${item.id}`}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <ThemedText type="h4" style={styles.roleType}>
              {item.roleType}
            </ThemedText>
            <StatusPill status={item.status as any} size="sm" />
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Feather name="map-pin" size={14} color={theme.textMuted} />
            <ThemedText style={[styles.detailText, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.workplaceName}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Feather name="calendar" size={14} color={theme.textMuted} />
            <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
              {formatDate(item.date)}
            </ThemedText>
          </View>
          <View style={styles.detailRow}>
            <Feather name="clock" size={14} color={theme.textMuted} />
            <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
              {formatTime(item.startTime)} - {formatTime(item.endTime)}
            </ThemedText>
          </View>
        </View>

        {item.requestedWorkerName ? (
          <View style={[styles.workerSection, { borderTopColor: theme.border }]}>
            <Feather name="user" size={14} color={theme.textMuted} />
            <ThemedText style={[styles.workerText, { color: theme.textSecondary }]}>
              Requested: {item.requestedWorkerName}
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

        {isExpanded ? (
          <ExpandedSection
            request={item}
            isPickerOpen={isPickerOpen}
            onAssignWorker={() => handleAssignWorker(item.id)}
            onBroadcast={() => handleBroadcast(item.id)}
            onSelectWorker={(workerId) => handleSelectWorker(item.id, workerId)}
            isAssigning={assignMutation.isPending}
            theme={theme}
          />
        ) : null}
      </Pressable>
    );
  };

  const renderEmpty = () => (
    <EmptyState
      image={require("../../assets/images/empty-requests.png")}
      title="No shift requests"
      description="No shift requests match your current filter"
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
        data={filteredRequests}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: paddingTop + Spacing.xl,
            paddingBottom: paddingBottom,
          },
          filteredRequests.length === 0 ? styles.emptyContent : undefined,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.primary}
          />
        }
        renderItem={renderRequestCard}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
}

function ExpandedSection({
  request,
  isPickerOpen,
  onAssignWorker,
  onBroadcast,
  onSelectWorker,
  isAssigning,
  theme,
}: {
  request: ShiftRequest;
  isPickerOpen: boolean;
  onAssignWorker: () => void;
  onBroadcast: () => void;
  onSelectWorker: (workerId: string) => void;
  isAssigning: boolean;
  theme: any;
}) {
  const { data: offersData } = useQuery<OffersResponse>({
    queryKey: ["/api/shift-requests", request.id, "offers"],
    enabled: request.status === "offered",
  });

  return (
    <View style={[styles.expandedSection, { borderTopColor: theme.border }]}>
      {request.status === "offered" && offersData ? (
        <View style={styles.offerCounters}>
          <View style={[styles.counterPill, { backgroundColor: theme.warning + "20" }]}>
            <ThemedText style={[styles.counterText, { color: theme.warning }]}>
              {offersData.counts.pending} Pending
            </ThemedText>
          </View>
          <View style={[styles.counterPill, { backgroundColor: theme.success + "20" }]}>
            <ThemedText style={[styles.counterText, { color: theme.success }]}>
              {offersData.counts.accepted} Accepted
            </ThemedText>
          </View>
          <View style={[styles.counterPill, { backgroundColor: theme.error + "20" }]}>
            <ThemedText style={[styles.counterText, { color: theme.error }]}>
              {offersData.counts.declined} Declined
            </ThemedText>
          </View>
        </View>
      ) : null}

      {request.status === "submitted" ? (
        <View style={styles.actionButtons}>
          <Pressable
            onPress={onAssignWorker}
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            testID={`assign-worker-${request.id}`}
          >
            <Feather name="user-plus" size={16} color="#fff" />
            <ThemedText style={styles.actionButtonText}>Assign Worker</ThemedText>
          </Pressable>
          <Pressable
            onPress={onBroadcast}
            disabled={isAssigning}
            style={[
              styles.actionButton,
              { backgroundColor: theme.success },
              isAssigning ? { opacity: 0.6 } : undefined,
            ]}
            testID={`broadcast-all-${request.id}`}
          >
            {isAssigning ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="send" size={16} color="#fff" />
            )}
            <ThemedText style={styles.actionButtonText}>Broadcast to All</ThemedText>
          </Pressable>
        </View>
      ) : null}

      {isPickerOpen ? (
        <WorkerPicker
          requestId={request.id}
          onSelectWorker={onSelectWorker}
          isAssigning={isAssigning}
          theme={theme}
        />
      ) : null}
    </View>
  );
}

function WorkerPicker({
  requestId,
  onSelectWorker,
  isAssigning,
  theme,
}: {
  requestId: string;
  onSelectWorker: (workerId: string) => void;
  isAssigning: boolean;
  theme: any;
}) {
  const { data, isLoading } = useQuery<EligibleWorkersResponse>({
    queryKey: [`/api/shift-requests/${requestId}/eligible-workers`],
  });

  if (isLoading) {
    return (
      <View style={styles.workerPickerLoading}>
        <ActivityIndicator size="small" color={theme.primary} />
        <ThemedText style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading eligible workers...
        </ThemedText>
      </View>
    );
  }

  const workers = data?.eligibleWorkers || [];

  if (workers.length === 0) {
    return (
      <View style={styles.workerPickerEmpty}>
        <ThemedText style={[styles.emptyPickerText, { color: theme.textMuted }]}>
          No eligible workers found
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.workerPickerContainer}>
      <ThemedText type="small" style={[styles.pickerLabel, { color: theme.textMuted }]}>
        {data?.totalEligible || 0} eligible of {data?.totalActive || 0} active workers
      </ThemedText>
      {workers.map((worker) => (
        <Pressable
          key={worker.id}
          onPress={() => onSelectWorker(worker.id)}
          disabled={isAssigning || worker.hasConflict}
          style={({ pressed }) => [
            styles.workerRow,
            {
              backgroundColor: pressed ? theme.backgroundSecondary : theme.backgroundDefault,
              borderColor: theme.border,
              opacity: worker.hasConflict ? 0.5 : (pressed ? 0.9 : 1),
            },
          ]}
          testID={`select-worker-${worker.id}`}
        >
          <View style={styles.workerInfo}>
            <Feather name="user" size={16} color={theme.textSecondary} />
            <ThemedText style={[styles.workerName, { color: theme.text }]}>
              {worker.fullName}
            </ThemedText>
          </View>
          <View style={styles.workerBadges}>
            {worker.roleMatch ? (
              <View style={[styles.badge, { backgroundColor: theme.success + "20" }]}>
                <ThemedText style={[styles.badgeText, { color: theme.success }]}>
                  Role Match
                </ThemedText>
              </View>
            ) : null}
            {worker.hasConflict ? (
              <View style={[styles.badge, { backgroundColor: theme.error + "20" }]}>
                <ThemedText style={[styles.badgeText, { color: theme.error }]}>
                  Conflict
                </ThemedText>
              </View>
            ) : null}
          </View>
        </Pressable>
      ))}
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
    height: Spacing.sm,
  },
  requestCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
  },
  cardHeader: {
    marginBottom: Spacing.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  roleType: {
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
  expandedSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  offerCounters: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    flexWrap: "wrap",
  },
  counterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  counterText: {
    fontSize: 12,
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  workerPickerContainer: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  pickerLabel: {
    marginBottom: Spacing.xs,
  },
  workerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  workerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  workerName: {
    fontSize: 14,
    fontWeight: "500",
  },
  workerBadges: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  workerPickerLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  loadingText: {
    fontSize: 13,
  },
  workerPickerEmpty: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  emptyPickerText: {
    fontSize: 13,
  },
});
