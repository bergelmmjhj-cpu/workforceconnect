import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { WorkerRequest } from "@/types";
import { getRequest, updateRequest } from "@/storage";
import { formatDate, formatShiftTime, formatSlaCountdown } from "@/utils/format";

export default function RequestDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();

  const { requestId } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [request, setRequest] = useState<WorkerRequest | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getRequest(requestId);
      setRequest(data);
    } catch (error) {
      console.error("Failed to load request:", error);
    } finally {
      setIsLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusUpdate = async (newStatus: WorkerRequest["status"]) => {
    if (!request) return;

    setIsUpdating(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await updateRequest(request.id, {
        status: newStatus,
        hrAssignedId: user?.role === "hr" ? user.id : request.hrAssignedId,
        hrAssignedName: user?.role === "hr" ? user.fullName : request.hrAssignedName,
      });
      await loadData();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to update request:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          styles.loadingContainer,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!request) {
    return (
      <View
        style={[
          styles.container,
          styles.loadingContainer,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <ThemedText>Request not found</ThemedText>
      </View>
    );
  }

  const sla = formatSlaCountdown(request.slaDeadline);
  const canEdit =
    (user?.role === "client" && request.clientId === user.id) ||
    user?.role === "hr" ||
    user?.role === "admin";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
    >
      <View
        style={[
          styles.statusBanner,
          {
            backgroundColor:
              request.status === "completed"
                ? theme.success + "15"
                : request.status === "cancelled"
                ? theme.error + "15"
                : theme.primary + "10",
          },
        ]}
      >
        <StatusPill status={request.status} />
        {sla.text && !["completed", "cancelled"].includes(request.status) ? (
          <View
            style={[
              styles.slaBadge,
              {
                backgroundColor: sla.isBreach
                  ? theme.error + "20"
                  : sla.isUrgent
                  ? theme.warning + "20"
                  : theme.primary + "15",
              },
            ]}
          >
            <Feather
              name="clock"
              size={12}
              color={
                sla.isBreach
                  ? theme.error
                  : sla.isUrgent
                  ? theme.warning
                  : theme.primary
              }
            />
            <ThemedText
              style={[
                styles.slaText,
                {
                  color: sla.isBreach
                    ? theme.error
                    : sla.isUrgent
                    ? theme.warning
                    : theme.primary,
                },
              ]}
            >
              SLA: {sla.text}
            </ThemedText>
          </View>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <ThemedText type="h2" style={styles.roleTitle}>
          {request.roleNeeded}
        </ThemedText>

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Feather name="user" size={16} color={theme.textMuted} />
            <View>
              <ThemedText
                style={[styles.detailLabel, { color: theme.textMuted }]}
              >
                Client
              </ThemedText>
              <ThemedText style={styles.detailValue}>
                {request.clientName}
              </ThemedText>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Feather name="map-pin" size={16} color={theme.textMuted} />
            <View>
              <ThemedText
                style={[styles.detailLabel, { color: theme.textMuted }]}
              >
                Location
              </ThemedText>
              <ThemedText style={styles.detailValue}>
                {request.locationMajorIntersection}
              </ThemedText>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Feather name="calendar" size={16} color={theme.textMuted} />
            <View>
              <ThemedText
                style={[styles.detailLabel, { color: theme.textMuted }]}
              >
                Date
              </ThemedText>
              <ThemedText style={styles.detailValue}>
                {formatDate(request.shiftStartTime)}
              </ThemedText>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Feather name="clock" size={16} color={theme.textMuted} />
            <View>
              <ThemedText
                style={[styles.detailLabel, { color: theme.textMuted }]}
              >
                Time
              </ThemedText>
              <ThemedText style={styles.detailValue}>
                {formatShiftTime(request.shiftStartTime, request.shiftEndTime)}
              </ThemedText>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Feather name="dollar-sign" size={16} color={theme.textMuted} />
            <View>
              <ThemedText
                style={[styles.detailLabel, { color: theme.textMuted }]}
              >
                Pay Structure
              </ThemedText>
              <ThemedText style={styles.detailValue}>
                {request.payStructure}
              </ThemedText>
            </View>
          </View>

          {request.hrAssignedName ? (
            <View style={styles.detailItem}>
              <Feather name="users" size={16} color={theme.textMuted} />
              <View>
                <ThemedText
                  style={[styles.detailLabel, { color: theme.textMuted }]}
                >
                  HR Assigned
                </ThemedText>
                <ThemedText style={styles.detailValue}>
                  {request.hrAssignedName}
                </ThemedText>
              </View>
            </View>
          ) : null}
        </View>

        {request.notes ? (
          <View style={styles.notesSection}>
            <ThemedText
              style={[styles.notesLabel, { color: theme.textSecondary }]}
            >
              Notes
            </ThemedText>
            <ThemedText style={styles.notesText}>{request.notes}</ThemedText>
          </View>
        ) : null}
      </View>

      {canEdit && !["completed", "cancelled"].includes(request.status) ? (
        <View style={styles.actions}>
          {user?.role === "hr" && request.status === "submitted" ? (
            <Button
              onPress={() => handleStatusUpdate("assigned")}
              disabled={isUpdating}
              style={styles.actionButton}
            >
              {isUpdating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                "Assign & Accept"
              )}
            </Button>
          ) : null}

          {user?.role === "hr" && request.status === "assigned" ? (
            <Button
              onPress={() => handleStatusUpdate("in_progress")}
              disabled={isUpdating}
              style={styles.actionButton}
            >
              {isUpdating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                "Start Shift"
              )}
            </Button>
          ) : null}

          {user?.role === "hr" && request.status === "in_progress" ? (
            <Button
              onPress={() => handleStatusUpdate("completed")}
              disabled={isUpdating}
              style={styles.actionButton}
            >
              {isUpdating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                "Mark Complete"
              )}
            </Button>
          ) : null}

          {user?.role === "client" && request.status === "draft" ? (
            <Button
              onPress={() => handleStatusUpdate("submitted")}
              disabled={isUpdating}
              style={styles.actionButton}
            >
              {isUpdating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                "Submit Request"
              )}
            </Button>
          ) : null}

          <Pressable
            onPress={() => handleStatusUpdate("cancelled")}
            disabled={isUpdating}
            style={({ pressed }) => [
              styles.cancelButton,
              {
                backgroundColor: theme.error + "10",
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <ThemedText style={[styles.cancelText, { color: theme.error }]}>
              Cancel Request
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  slaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  slaText: {
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  roleTitle: {
    marginBottom: Spacing.xl,
  },
  detailsGrid: {
    gap: Spacing.lg,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "500",
  },
  notesSection: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  notesLabel: {
    fontSize: 12,
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  actionButton: {},
  cancelButton: {
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontWeight: "600",
  },
});
