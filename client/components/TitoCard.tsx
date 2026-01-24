import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { StatusPill } from "@/components/StatusPill";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Shadows } from "@/constants/theme";
import { TitoLog } from "@/types";
import { formatDate, formatTime } from "@/utils/format";

interface TitoCardProps {
  tito: TitoLog;
  onPress?: () => void;
  onApprove?: () => void;
  onDispute?: () => void;
  showActions?: boolean;
}

export function TitoCard({
  tito,
  onPress,
  onApprove,
  onDispute,
  showActions = false,
}: TitoCardProps) {
  const { theme } = useTheme();

  const verificationIcons: Record<string, keyof typeof Feather.glyphMap> = {
    gps: "map-pin",
    manual: "edit-3",
    selfie_placeholder: "camera",
    other: "check",
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.surface,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <Avatar name={tito.workerName} role="worker" size={36} />
        <View style={styles.headerInfo}>
          <ThemedText type="h4" numberOfLines={1}>
            {tito.workerName}
          </ThemedText>
          <ThemedText
            style={[styles.subtitle, { color: theme.textSecondary }]}
          >
            {formatDate(tito.shiftDate)}
          </ThemedText>
        </View>
        <StatusPill status={tito.status} size="sm" />
      </View>

      <View style={styles.times}>
        <View style={styles.timeBlock}>
          <ThemedText
            style={[styles.timeLabel, { color: theme.textMuted }]}
          >
            Time In
          </ThemedText>
          <View style={styles.timeValue}>
            <Feather name="log-in" size={14} color={theme.success} />
            <ThemedText style={styles.timeText}>
              {tito.timeIn ? formatTime(tito.timeIn) : "--:--"}
            </ThemedText>
          </View>
          {tito.timeInLocation ? (
            <ThemedText
              style={[styles.location, { color: theme.textMuted }]}
              numberOfLines={1}
            >
              {tito.timeInLocation}
            </ThemedText>
          ) : null}
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        <View style={styles.timeBlock}>
          <ThemedText
            style={[styles.timeLabel, { color: theme.textMuted }]}
          >
            Time Out
          </ThemedText>
          <View style={styles.timeValue}>
            <Feather name="log-out" size={14} color={theme.error} />
            <ThemedText style={styles.timeText}>
              {tito.timeOut ? formatTime(tito.timeOut) : "--:--"}
            </ThemedText>
          </View>
          {tito.timeOutLocation ? (
            <ThemedText
              style={[styles.location, { color: theme.textMuted }]}
              numberOfLines={1}
            >
              {tito.timeOutLocation}
            </ThemedText>
          ) : null}
        </View>
      </View>

      <View style={styles.verification}>
        <Feather
          name={verificationIcons[tito.verificationMethod] || "check"}
          size={12}
          color={theme.textMuted}
        />
        <ThemedText style={[styles.verificationText, { color: theme.textMuted }]}>
          Verified via {tito.verificationMethod.replace("_", " ")}
        </ThemedText>
      </View>

      {showActions && tito.status === "pending" ? (
        <View style={styles.actions}>
          <Pressable
            onPress={onDispute}
            style={[
              styles.actionBtn,
              { backgroundColor: theme.error + "10" },
            ]}
          >
            <Feather name="x" size={16} color={theme.error} />
            <ThemedText style={[styles.actionText, { color: theme.error }]}>
              Dispute
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={onApprove}
            style={[
              styles.actionBtn,
              styles.actionBtnPrimary,
              { backgroundColor: theme.success },
            ]}
          >
            <Feather name="check" size={16} color="#fff" />
            <ThemedText style={[styles.actionText, { color: "#fff" }]}>
              Approve
            </ThemedText>
          </Pressable>
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
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  headerInfo: {
    flex: 1,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  times: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  timeBlock: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timeValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  timeText: {
    fontSize: 18,
    fontWeight: "600",
  },
  location: {
    fontSize: 11,
    marginTop: 4,
  },
  divider: {
    width: 1,
    alignSelf: "stretch",
  },
  verification: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  verificationText: {
    fontSize: 11,
    textTransform: "capitalize",
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  actionBtnPrimary: {},
  actionText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
