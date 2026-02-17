import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  SectionList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Modal,
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
  createdAt: string;
  shiftTitle: string;
  shiftDate: string;
  shiftStartTime: string;
  shiftEndTime: string;
  workplaceName: string;
  shiftRoleType: string;
  shiftNotes: string | null;
}

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

export default function ShiftOffersScreen() {
  const { paddingTop, paddingBottom } = useContentPadding();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [declineOffer, setDeclineOffer] = useState<ShiftOffer | null>(null);

  const { data: offers = [], isLoading, refetch, isRefetching } = useQuery<ShiftOffer[]>({
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

  const handleRespond = (id: string, response: "accepted" | "declined") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRespondingId(id);
    respondMutation.mutate({ id, response });
  };

  const handleDeclinePress = (offer: ShiftOffer) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDeclineOffer(offer);
  };

  const confirmDecline = () => {
    if (declineOffer) {
      handleRespond(declineOffer.id, "declined");
    }
  };

  const sections = useMemo(() => {
    const pending = offers.filter((o) => o.status === "pending");
    const responded = offers.filter((o) => o.status !== "pending");
    const result = [];
    if (pending.length > 0) {
      result.push({ title: "Pending Offers", data: pending });
    }
    if (responded.length > 0) {
      result.push({ title: "Recent Responses", data: responded });
    }
    return result;
  }, [offers]);

  const getStatusForPill = (status: string) => {
    switch (status) {
      case "pending":
        return "pending" as const;
      case "accepted":
        return "approved" as const;
      case "declined":
        return "cancelled" as const;
      default:
        return "pending" as const;
    }
  };

  const renderOfferCard = ({ item }: { item: ShiftOffer }) => {
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
              {item.workplaceName}
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

        {item.shiftNotes ? (
          <View style={[styles.notesRow, { borderTopColor: theme.border }]}>
            <ThemedText type="small" style={{ color: theme.textMuted, fontSize: 12 }} numberOfLines={2}>
              {item.shiftNotes}
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
  };

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={[styles.sectionHeader, { backgroundColor: theme.backgroundRoot }]}>
      <ThemedText type="h3">{section.title}</ThemedText>
    </View>
  );

  const renderEmpty = () => (
    <EmptyState
      image={require("../../assets/images/empty-shifts.png")}
      title="No shift offers"
      description="You don't have any shift offers at the moment. Check back later!"
    />
  );

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

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {offers.length > 0 ? (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderOfferCard}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop, paddingBottom },
          ]}
          stickySectionHeadersEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={theme.primary}
            />
          }
        />
      ) : (
        <SectionList
          sections={[]}
          keyExtractor={() => "empty"}
          renderItem={() => null}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            styles.emptyContent,
            { paddingTop, paddingBottom },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={theme.primary}
            />
          }
        />
      )}

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
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  emptyContent: {
    flexGrow: 1,
  },
  sectionHeader: {
    paddingVertical: Spacing.md,
    paddingTop: Spacing.lg,
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
  notesRow: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
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
