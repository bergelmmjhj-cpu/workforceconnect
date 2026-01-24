import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { StatusPill } from "@/components/StatusPill";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { WorkerRequest } from "@/types";
import { formatDate, formatShiftTime, formatSlaCountdown } from "@/utils/format";

interface RequestCardProps {
  request: WorkerRequest;
  onPress?: () => void;
  showClient?: boolean;
}

export function RequestCard({ request, onPress, showClient = false }: RequestCardProps) {
  const { theme } = useTheme();
  const sla = formatSlaCountdown(request.slaDeadline);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.surface,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <ThemedText type="h4" numberOfLines={1} style={styles.title}>
            {request.roleNeeded}
          </ThemedText>
          <StatusPill status={request.status} size="sm" />
        </View>
        {showClient ? (
          <ThemedText
            style={[styles.clientName, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {request.clientName}
          </ThemedText>
        ) : null}
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Feather name="map-pin" size={14} color={theme.textMuted} />
          <ThemedText
            style={[styles.detailText, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {request.locationMajorIntersection}
          </ThemedText>
        </View>
        <View style={styles.detailRow}>
          <Feather name="calendar" size={14} color={theme.textMuted} />
          <ThemedText
            style={[styles.detailText, { color: theme.textSecondary }]}
          >
            {formatDate(request.shiftStartTime)}
          </ThemedText>
        </View>
        <View style={styles.detailRow}>
          <Feather name="clock" size={14} color={theme.textMuted} />
          <ThemedText
            style={[styles.detailText, { color: theme.textSecondary }]}
          >
            {formatShiftTime(request.shiftStartTime, request.shiftEndTime)}
          </ThemedText>
        </View>
      </View>

      {sla.text && request.status !== "completed" && request.status !== "cancelled" ? (
        <View style={styles.footer}>
          <View
            style={[
              styles.slaBadge,
              {
                backgroundColor: sla.isBreach
                  ? theme.error + "15"
                  : sla.isUrgent
                  ? theme.warning + "15"
                  : theme.primary + "10",
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
              {sla.text}
            </ThemedText>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
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
  clientName: {
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
  footer: {
    marginTop: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
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
    fontSize: 11,
    fontWeight: "600",
  },
});
