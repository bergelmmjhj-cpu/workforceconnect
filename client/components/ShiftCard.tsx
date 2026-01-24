import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { StatusPill } from "@/components/StatusPill";
import { Avatar } from "@/components/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { Shift } from "@/types";
import { formatDate, formatShiftTime } from "@/utils/format";

interface ShiftCardProps {
  shift: Shift;
  onPress?: () => void;
  showWorkers?: boolean;
  showClient?: boolean;
}

const statusBorderColors: Record<Shift["status"], string> = {
  scheduled: "#3B82F6",
  in_progress: "#10B981",
  completed: "#64748B",
  cancelled: "#EF4444",
};

export function ShiftCard({
  shift,
  onPress,
  showWorkers = true,
  showClient = false,
}: ShiftCardProps) {
  const { theme } = useTheme();
  const borderColor = statusBorderColors[shift.status];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.surface,
          borderLeftColor: borderColor,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <ThemedText type="h4" numberOfLines={1} style={styles.title}>
            {shift.roleNeeded}
          </ThemedText>
          <StatusPill status={shift.status} size="sm" />
        </View>
        {showClient ? (
          <ThemedText
            style={[styles.subtitle, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {shift.clientName}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Feather name="calendar" size={14} color={theme.textMuted} />
          <ThemedText
            style={[styles.detailText, { color: theme.textSecondary }]}
          >
            {formatDate(shift.startTime)}
          </ThemedText>
        </View>
        <View style={styles.detailRow}>
          <Feather name="clock" size={14} color={theme.textMuted} />
          <ThemedText
            style={[styles.detailText, { color: theme.textSecondary }]}
          >
            {formatShiftTime(shift.startTime, shift.endTime)}
          </ThemedText>
        </View>
        <View style={styles.detailRow}>
          <Feather name="map-pin" size={14} color={theme.textMuted} />
          <ThemedText
            style={[styles.detailText, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {shift.locationMajorIntersection}
          </ThemedText>
        </View>
      </View>

      {showWorkers && shift.workerNames.length > 0 ? (
        <View style={styles.workersSection}>
          <View style={styles.avatarStack}>
            {shift.workerNames.slice(0, 3).map((name, index) => (
              <View
                key={index}
                style={[
                  styles.avatarWrapper,
                  { marginLeft: index > 0 ? -12 : 0 },
                ]}
              >
                <Avatar name={name} role="worker" size={28} />
              </View>
            ))}
          </View>
          <ThemedText
            style={[styles.workerText, { color: theme.textSecondary }]}
          >
            {shift.workerNames.length === 1
              ? shift.workerNames[0]
              : `${shift.workerNames.length} workers assigned`}
          </ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderLeftWidth: 4,
    ...Shadows.sm,
  },
  header: {
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  title: {
    flex: 1,
  },
  subtitle: {
    fontSize: 13,
    marginTop: Spacing.xs,
  },
  details: {
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
  workersSection: {
    marginTop: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  avatarStack: {
    flexDirection: "row",
  },
  avatarWrapper: {
    borderWidth: 2,
    borderColor: "#fff",
    borderRadius: 16,
  },
  workerText: {
    fontSize: 13,
    flex: 1,
  },
});
