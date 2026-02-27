import React, { useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { StatusPill } from "@/components/StatusPill";
import { Avatar } from "@/components/Avatar";
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
  const [expanded, setExpanded] = useState(false);

  const verificationIcons: Record<string, keyof typeof Feather.glyphMap> = {
    gps: "map-pin",
    manual: "edit-3",
    selfie_placeholder: "camera",
    other: "check",
  };

  const isCanceled = tito.status === "canceled";
  const isAdjusted = tito.corrected === true;

  return (
    <Pressable
      onPress={() => setExpanded(!expanded)}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.surface,
          opacity: pressed ? 0.95 : 1,
        },
        isCanceled ? { opacity: 0.6 } : undefined,
      ]}
      testID={`tito-card-${tito.id}`}
    >
      <View style={styles.compactRow}>
        <Avatar name={tito.workerName} role="worker" size={24} />
        <View style={styles.nameCol}>
          <ThemedText style={styles.compactName} numberOfLines={1}>
            {tito.workerName}
          </ThemedText>
          <ThemedText style={[styles.compactDate, { color: theme.textMuted }]}>
            {formatDate(tito.shiftDate)}
          </ThemedText>
        </View>
        <View style={styles.timesCompact}>
          <View style={styles.timeInline}>
            <Feather name="log-in" size={11} color={theme.success} />
            <ThemedText style={styles.compactTime}>
              {tito.timeIn ? formatTime(tito.timeIn) : "--:--"}
            </ThemedText>
          </View>
          <View style={styles.timeInline}>
            <Feather name="log-out" size={11} color={theme.error} />
            <ThemedText style={styles.compactTime}>
              {tito.timeOut ? formatTime(tito.timeOut) : "--:--"}
            </ThemedText>
          </View>
        </View>
        <Feather
          name={verificationIcons[tito.verificationMethod] || "check"}
          size={12}
          color={theme.textMuted}
        />
        <StatusPill status={isCanceled ? "cancelled" : tito.status} size="sm" />
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={14}
          color={theme.textMuted}
        />
      </View>

      {expanded ? (
        <View style={[styles.details, { borderTopColor: theme.border }]}>
          {isAdjusted ? (
            <View style={[styles.badge, { backgroundColor: "#F59E0B20" }]}>
              <Feather name="edit-2" size={10} color="#F59E0B" />
              <ThemedText style={[styles.badgeText, { color: "#F59E0B" }]}>Adjusted</ThemedText>
            </View>
          ) : null}

          {tito.timeInLocation ? (
            <View style={styles.detailRow}>
              <ThemedText style={[styles.detailLabel, { color: theme.textMuted }]}>In Location</ThemedText>
              <ThemedText style={styles.detailValue} numberOfLines={1}>{tito.timeInLocation}</ThemedText>
            </View>
          ) : null}

          {tito.timeOutLocation ? (
            <View style={styles.detailRow}>
              <ThemedText style={[styles.detailLabel, { color: theme.textMuted }]}>Out Location</ThemedText>
              <ThemedText style={styles.detailValue} numberOfLines={1}>{tito.timeOutLocation}</ThemedText>
            </View>
          ) : null}

          <View style={styles.detailRow}>
            <ThemedText style={[styles.detailLabel, { color: theme.textMuted }]}>Verification</ThemedText>
            <ThemedText style={styles.detailValue}>{tito.verificationMethod.replace("_", " ")}</ThemedText>
          </View>

          {tito.totalHours != null ? (
            <View style={styles.detailRow}>
              <ThemedText style={[styles.detailLabel, { color: theme.textMuted }]}>Total Hours</ThemedText>
              <ThemedText style={styles.detailValue}>{tito.totalHours.toFixed(2)}</ThemedText>
            </View>
          ) : null}

          {showActions && tito.status === "pending" ? (
            <View style={styles.actions}>
              <Pressable
                onPress={(e) => { e.stopPropagation(); onDispute?.(); }}
                style={[styles.actionBtn, { backgroundColor: theme.error + "10" }]}
              >
                <Feather name="x" size={14} color={theme.error} />
                <ThemedText style={[styles.actionText, { color: theme.error }]}>Dispute</ThemedText>
              </Pressable>
              <Pressable
                onPress={(e) => { e.stopPropagation(); onApprove?.(); }}
                style={[styles.actionBtn, styles.actionBtnPrimary, { backgroundColor: theme.success }]}
              >
                <Feather name="check" size={14} color="#fff" />
                <ThemedText style={[styles.actionText, { color: "#fff" }]}>Approve</ThemedText>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    ...Shadows.sm,
  },
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  nameCol: {
    flex: 1,
    minWidth: 0,
  },
  compactName: {
    fontSize: 13,
    fontWeight: "600",
  },
  compactDate: {
    fontSize: 10,
  },
  timesCompact: {
    alignItems: "flex-end",
    gap: 1,
  },
  timeInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  compactTime: {
    fontSize: 12,
    fontWeight: "600",
  },
  details: {
    marginTop: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    gap: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 11,
    flex: 1,
    textAlign: "right",
    textTransform: "capitalize",
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  actionBtnPrimary: {},
  actionText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
