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
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { Shift, TitoLog } from "@/types";
import { getShift, updateShift, getTitoLogs, createTitoLog } from "@/storage";
import { formatDate, formatShiftTime, formatCurrency } from "@/utils/format";

export default function ShiftDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { user } = useAuth();

  const { shiftId } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [shift, setShift] = useState<Shift | null>(null);
  const [titoLogs, setTitoLogs] = useState<TitoLog[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [shiftData, titoData] = await Promise.all([
        getShift(shiftId),
        getTitoLogs(),
      ]);
      setShift(shiftData);
      setTitoLogs(titoData.filter((t) => t.shiftId === shiftId));
    } catch (error) {
      console.error("Failed to load shift:", error);
    } finally {
      setIsLoading(false);
    }
  }, [shiftId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClockIn = async () => {
    if (!shift || !user) return;

    setIsUpdating(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      await createTitoLog({
        shiftId: shift.id,
        workerId: user.id,
        workerName: user.fullName,
        timeIn: new Date().toISOString(),
        timeInLocation: shift.locationMajorIntersection,
        verificationMethod: "manual",
        status: "pending",
        shiftDate: shift.startTime,
      });

      await updateShift(shift.id, { status: "in_progress" });
      await loadData();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to clock in:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClockOut = async () => {
    if (!shift || !user) return;

    const myLog = titoLogs.find(
      (t) => t.workerId === user.id && t.timeIn && !t.timeOut
    );
    if (!myLog) return;

    setIsUpdating(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const { updateTitoLog } = await import("@/storage");
      await updateTitoLog(myLog.id, {
        timeOut: new Date().toISOString(),
        timeOutLocation: shift.locationMajorIntersection,
      });

      await loadData();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to clock out:", error);
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

  if (!shift) {
    return (
      <View
        style={[
          styles.container,
          styles.loadingContainer,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <ThemedText>Shift not found</ThemedText>
      </View>
    );
  }

  const isWorker = user?.role === "worker";
  const isAssigned = shift.workerIds.includes(user?.id || "");
  const myLog = titoLogs.find((t) => t.workerId === user?.id);
  const hasClockedIn = myLog && myLog.timeIn;
  const hasClockedOut = myLog && myLog.timeOut;

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
              shift.status === "completed"
                ? theme.success + "15"
                : shift.status === "in_progress"
                ? theme.primary + "15"
                : theme.backgroundSecondary,
          },
        ]}
      >
        <StatusPill status={shift.status} />
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <ThemedText type="h2" style={styles.roleTitle}>
          {shift.roleNeeded}
        </ThemedText>

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Feather name="briefcase" size={16} color={theme.textMuted} />
            <View>
              <ThemedText
                style={[styles.detailLabel, { color: theme.textMuted }]}
              >
                Client
              </ThemedText>
              <ThemedText style={styles.detailValue}>
                {shift.clientName}
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
                {shift.locationMajorIntersection}
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
                {formatDate(shift.startTime)}
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
                {formatShiftTime(shift.startTime, shift.endTime)}
              </ThemedText>
            </View>
          </View>

          <View style={styles.detailItem}>
            <Feather name="dollar-sign" size={16} color={theme.textMuted} />
            <View>
              <ThemedText
                style={[styles.detailLabel, { color: theme.textMuted }]}
              >
                Pay Rate
              </ThemedText>
              <ThemedText style={styles.detailValue}>
                {formatCurrency(shift.payRate)}/hour
              </ThemedText>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Assigned Workers
        </ThemedText>
        <View style={styles.workersList}>
          {shift.workerNames.map((name, index) => (
            <View key={index} style={styles.workerItem}>
              <Avatar name={name} role="worker" size={40} />
              <ThemedText style={styles.workerName}>{name}</ThemedText>
            </View>
          ))}
        </View>
      </View>

      {isWorker && isAssigned && shift.status !== "completed" ? (
        <View style={styles.titoSection}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Time Tracking
          </ThemedText>

          {shift.locationCoordinates ? (
            <View style={styles.gpsInfo}>
              <View style={styles.gpsInfoRow}>
                <Feather name="navigation" size={16} color={theme.primary} />
                <ThemedText style={[styles.gpsInfoText, { color: theme.textSecondary }]}>
                  GPS verification enabled ({shift.geofenceRadius}m radius)
                </ThemedText>
              </View>
              <Button
                onPress={() => navigation.navigate("ClockInOut", { shiftId: shift.id })}
                style={[styles.titoButton, { backgroundColor: theme.primary }]}
              >
                <View style={styles.titoButtonContent}>
                  <Feather name="map-pin" size={20} color="#fff" />
                  <ThemedText style={styles.titoButtonText}>
                    {!hasClockedIn ? "Clock In with GPS" : !hasClockedOut ? "Clock Out with GPS" : "View Time Entry"}
                  </ThemedText>
                </View>
              </Button>
            </View>
          ) : !hasClockedIn ? (
            <Button
              onPress={handleClockIn}
              disabled={isUpdating}
              style={[styles.titoButton, { backgroundColor: theme.success }]}
            >
              {isUpdating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <View style={styles.titoButtonContent}>
                  <Feather name="log-in" size={20} color="#fff" />
                  <ThemedText style={styles.titoButtonText}>
                    Clock In
                  </ThemedText>
                </View>
              )}
            </Button>
          ) : !hasClockedOut ? (
            <Button
              onPress={handleClockOut}
              disabled={isUpdating}
              style={[styles.titoButton, { backgroundColor: theme.error }]}
            >
              {isUpdating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <View style={styles.titoButtonContent}>
                  <Feather name="log-out" size={20} color="#fff" />
                  <ThemedText style={styles.titoButtonText}>
                    Clock Out
                  </ThemedText>
                </View>
              )}
            </Button>
          ) : (
            <View
              style={[
                styles.completedBanner,
                { backgroundColor: theme.success + "15" },
              ]}
            >
              <Feather name="check-circle" size={20} color={theme.success} />
              <ThemedText style={{ color: theme.success, fontWeight: "600" }}>
                Time submitted for approval
              </ThemedText>
            </View>
          )}
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
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
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
  sectionTitle: {
    marginBottom: Spacing.lg,
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
  workersList: {
    gap: Spacing.md,
  },
  workerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  workerName: {
    fontSize: 15,
    fontWeight: "500",
  },
  titoSection: {
    marginTop: Spacing.lg,
  },
  gpsInfo: {
    gap: Spacing.md,
  },
  gpsInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  gpsInfoText: {
    fontSize: 14,
  },
  titoButton: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  titoButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  titoButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
});
