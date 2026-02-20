import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Modal,
  ScrollView,
} from "react-native";
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
import { apiRequest, queryClient } from "@/lib/query-client";
import { Spacing, BorderRadius } from "@/constants/theme";

interface ShiftOffer {
  id: string;
  shiftId: string;
  workerId: string;
  status: string;
  offeredAt: string;
  respondedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  shiftTitle: string;
  shiftDate: string;
  shiftStartTime: string;
  shiftEndTime: string;
  workplaceName: string;
  workplaceCity: string | null;
  shiftRoleType: string;
  workerName?: string;
}

type FilterTab = "all" | "pending" | "accepted" | "declined" | "cancelled";

const FILTER_TABS: { key: FilterTab; label: string; icon: string }[] = [
  { key: "all", label: "All", icon: "list" },
  { key: "pending", label: "Pending", icon: "clock" },
  { key: "accepted", label: "Accepted", icon: "check-circle" },
  { key: "declined", label: "Declined", icon: "x-circle" },
  { key: "cancelled", label: "Filled", icon: "user-check" },
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

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ShiftOffersScreen() {
  const { paddingTop, paddingBottom } = useContentPadding();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [declineOffer, setDeclineOffer] = useState<ShiftOffer | null>(null);

  const { data: offers = [], isLoading, isError, refetch, isRefetching } = useQuery<ShiftOffer[]>({
    queryKey: ["/api/shift-offers"],
    refetchInterval: 15000,
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, response }: { id: string; response: "accepted" | "declined" }) => {
      const res = await apiRequest("POST", `/api/shift-offers/${id}/respond`, { response });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-offers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-today"] });
      setRespondingId(null);
      setDeclineOffer(null);
    },
    onError: () => {
      setRespondingId(null);
      setDeclineOffer(null);
    },
  });

  const handleRespond = useCallback((id: string, response: "accepted" | "declined") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRespondingId(id);
    respondMutation.mutate({ id, response });
  }, [respondMutation]);

  const handleDeclinePress = useCallback((offer: ShiftOffer) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDeclineOffer(offer);
  }, []);

  const confirmDecline = useCallback(() => {
    if (declineOffer) {
      handleRespond(declineOffer.id, "declined");
    }
  }, [declineOffer, handleRespond]);

  const filteredOffers = useMemo(() => {
    if (activeFilter === "all") return offers;
    return offers.filter((o) => o.status === activeFilter);
  }, [offers, activeFilter]);

  const filterCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = { all: offers.length, pending: 0, accepted: 0, declined: 0, cancelled: 0 };
    for (const o of offers) {
      if (o.status in counts) {
        counts[o.status as FilterTab]++;
      }
    }
    return counts;
  }, [offers]);

  const getStatusForPill = (status: string) => {
    switch (status) {
      case "pending": return "pending" as const;
      case "accepted": return "approved" as const;
      case "declined": return "cancelled" as const;
      case "cancelled": return "pending" as const;
      default: return "pending" as const;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return theme.warning;
      case "accepted": return theme.success;
      case "declined": return theme.error;
      case "cancelled": return theme.textMuted;
      default: return theme.textMuted;
    }
  };

  const renderOfferCard = useCallback(({ item }: { item: ShiftOffer }) => {
    const isPending = item.status === "pending";
    const isResponding = respondingId === item.id;

    return (
      <Card elevation={1} style={styles.offerCard}>
        <View style={styles.cardHeader}>
          <ThemedText type="h4" style={styles.roleText}>
            {item.shiftRoleType || item.shiftTitle}
          </ThemedText>
          {item.status === "cancelled" ? (
            <View style={[styles.filledPill, { backgroundColor: theme.backgroundSecondary }]}>
              <Feather name="user-check" size={12} color={theme.textMuted} />
              <ThemedText style={{ fontSize: 11, fontWeight: "600", color: theme.textMuted }}>Filled</ThemedText>
            </View>
          ) : (
            <StatusPill status={getStatusForPill(item.status)} size="sm" />
          )}
        </View>

        {item.workplaceName ? (
          <View style={styles.detailRow}>
            <Feather name="map-pin" size={14} color={theme.textMuted} />
            <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>
              {item.workplaceName}{item.workplaceCity ? `, ${item.workplaceCity}` : ""}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.detailRow}>
          <Feather name="calendar" size={14} color={theme.textMuted} />
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {formatDate(item.shiftDate)}
          </ThemedText>
        </View>

        <View style={styles.detailRow}>
          <Feather name="clock" size={14} color={theme.textMuted} />
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {formatTime(item.shiftStartTime)} - {formatTime(item.shiftEndTime)}
          </ThemedText>
        </View>

        {item.offeredAt ? (
          <View style={styles.detailRow}>
            <Feather name="send" size={14} color={theme.textMuted} />
            <ThemedText type="small" style={{ color: theme.textMuted, fontSize: 12 }}>
              Offered {formatRelativeTime(item.offeredAt)}
            </ThemedText>
          </View>
        ) : null}

        {item.respondedAt && item.status !== "pending" ? (
          <View style={styles.detailRow}>
            <Feather name={item.status === "accepted" ? "check" : "x"} size={14} color={getStatusColor(item.status)} />
            <ThemedText type="small" style={{ color: theme.textMuted, fontSize: 12 }}>
              {item.status === "accepted" ? "Accepted" : item.status === "declined" ? "Declined" : "Updated"} {formatRelativeTime(item.respondedAt)}
            </ThemedText>
          </View>
        ) : null}

        {item.cancelReason ? (
          <View style={[styles.reasonRow, { backgroundColor: theme.backgroundTertiary }]}>
            <Feather name="info" size={12} color={theme.textMuted} />
            <ThemedText type="small" style={{ color: theme.textMuted, fontSize: 12, flex: 1 }}>
              {item.cancelReason}
            </ThemedText>
          </View>
        ) : null}

        {item.workerName ? (
          <View style={styles.detailRow}>
            <Feather name="user" size={14} color={theme.textMuted} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {item.workerName}
            </ThemedText>
          </View>
        ) : null}

        {isPending ? (
          <View style={styles.buttonRow}>
            <Pressable
              testID={`button-accept-${item.id}`}
              onPress={() => handleRespond(item.id, "accepted")}
              disabled={isResponding}
              style={[
                styles.actionButton,
                { backgroundColor: theme.success, opacity: isResponding ? 0.6 : 1 },
              ]}
            >
              {isResponding && respondMutation.variables?.response === "accepted" ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="check" size={16} color="#FFFFFF" />
                  <ThemedText style={styles.buttonText}>Accept</ThemedText>
                </>
              )}
            </Pressable>
            <Pressable
              testID={`button-decline-${item.id}`}
              onPress={() => handleDeclinePress(item)}
              disabled={isResponding}
              style={[
                styles.actionButton,
                { backgroundColor: theme.backgroundTertiary, opacity: isResponding ? 0.6 : 1 },
              ]}
            >
              {isResponding && respondMutation.variables?.response === "declined" ? (
                <ActivityIndicator size="small" color={theme.error} />
              ) : (
                <>
                  <Feather name="x" size={16} color={theme.error} />
                  <ThemedText style={[styles.buttonText, { color: theme.error }]}>Decline</ThemedText>
                </>
              )}
            </Pressable>
          </View>
        ) : null}
      </Card>
    );
  }, [respondingId, respondMutation, theme, handleRespond, handleDeclinePress]);

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop,
            paddingHorizontal: Spacing.lg,
          },
        ]}
      >
        <ListSkeleton count={4} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.backgroundRoot, paddingTop }]}>
        <Feather name="alert-circle" size={48} color={theme.error} />
        <ThemedText type="h3" style={{ marginTop: Spacing.lg, textAlign: "center" }}>
          Failed to load offers
        </ThemedText>
        <ThemedText style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
          Check your connection and try again
        </ThemedText>
        <Pressable
          testID="button-retry"
          onPress={() => refetch()}
          style={[styles.retryButton, { backgroundColor: theme.primary }]}
        >
          <Feather name="refresh-cw" size={16} color="#FFFFFF" />
          <ThemedText style={styles.buttonText}>Retry</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={{ paddingTop }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBar}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            const count = filterCounts[tab.key];
            return (
              <Pressable
                key={tab.key}
                testID={`filter-tab-${tab.key}`}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveFilter(tab.key);
                }}
                style={[
                  styles.filterTab,
                  {
                    backgroundColor: isActive ? theme.primary : theme.backgroundSecondary,
                    borderColor: isActive ? theme.primary : theme.border,
                  },
                ]}
              >
                <Feather
                  name={tab.icon as any}
                  size={14}
                  color={isActive ? "#FFFFFF" : theme.textSecondary}
                />
                <ThemedText
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: isActive ? "#FFFFFF" : theme.textSecondary,
                  }}
                >
                  {tab.label}
                </ThemedText>
                {count > 0 ? (
                  <View style={[styles.countBadge, { backgroundColor: isActive ? "rgba(255,255,255,0.3)" : theme.backgroundTertiary }]}>
                    <ThemedText style={{ fontSize: 11, fontWeight: "700", color: isActive ? "#FFFFFF" : theme.textMuted }}>
                      {count}
                    </ThemedText>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredOffers}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderOfferCard}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom },
          filteredOffers.length === 0 ? styles.emptyContent : undefined,
        ]}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <EmptyState
            image={require("../../assets/images/empty-shifts.png")}
            title={activeFilter === "all" ? "No shift offers" : `No ${activeFilter} offers`}
            description={
              activeFilter === "pending"
                ? "You don't have any pending shift offers right now."
                : activeFilter === "all"
                ? "You don't have any shift offers at the moment. Check back later!"
                : `No offers with ${activeFilter} status.`
            }
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.primary}
          />
        }
      />

      <Modal
        visible={declineOffer !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeclineOffer(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setDeclineOffer(null)}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={[styles.modalIconCircle, { backgroundColor: theme.error + "15" }]}>
              <Feather name="alert-triangle" size={28} color={theme.error} />
            </View>
            <ThemedText type="h3" style={{ textAlign: "center", marginBottom: Spacing.sm }}>
              Decline this offer?
            </ThemedText>
            <ThemedText style={{ textAlign: "center", color: theme.textSecondary, marginBottom: Spacing.xs }}>
              {declineOffer ? `${declineOffer.shiftRoleType || declineOffer.shiftTitle}` : ""}
            </ThemedText>
            {declineOffer ? (
              <ThemedText type="small" style={{ textAlign: "center", color: theme.textMuted, marginBottom: Spacing.lg }}>
                {formatDate(declineOffer.shiftDate)} {formatTime(declineOffer.shiftStartTime)} - {formatTime(declineOffer.shiftEndTime)}
              </ThemedText>
            ) : null}
            <ThemedText type="small" style={{ textAlign: "center", color: theme.textMuted, marginBottom: Spacing.xl }}>
              This action cannot be undone. The shift may be offered to another worker.
            </ThemedText>
            <View style={styles.modalButtons}>
              <Pressable
                testID="button-cancel-decline"
                onPress={() => setDeclineOffer(null)}
                style={[styles.modalButton, { backgroundColor: theme.backgroundTertiary }]}
              >
                <ThemedText style={{ fontWeight: "600" }}>Keep Offer</ThemedText>
              </Pressable>
              <Pressable
                testID="button-confirm-decline"
                onPress={confirmDecline}
                style={[styles.modalButton, { backgroundColor: theme.error }]}
              >
                <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>Decline</ThemedText>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  filterBar: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  emptyContent: {
    flexGrow: 1,
  },
  separator: {
    height: Spacing.md,
  },
  offerCard: {
    paddingVertical: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  roleText: {
    flex: 1,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
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
  buttonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  filledPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
});
