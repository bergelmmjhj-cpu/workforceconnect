import React from "react";
import { View, StyleSheet, Pressable, Linking, Platform } from "react-native";
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
  userRole?: string;
}

export function TitoCard({
  tito,
  onPress,
  onApprove,
  onDispute,
  showActions = false,
  userRole,
}: TitoCardProps) {
  const { theme } = useTheme();

  const isAdminOrHR = userRole === "admin" || userRole === "hr";

  const verificationIcons: Record<string, keyof typeof Feather.glyphMap> = {
    gps: "map-pin",
    manual: "edit-3",
    selfie_placeholder: "camera",
    other: "check",
  };

  const isCanceled = tito.status === "canceled";
  const isAdjusted = tito.corrected === true;

  const handleText = () => {
    const dateStr = formatDate(tito.shiftDate);
    const message = `Regarding your TITO log on ${dateStr}, please review.`;
    const smsUrl = Platform.select({
      ios: `sms:2896705697&body=${encodeURIComponent(message)}`,
      default: `sms:2896705697?body=${encodeURIComponent(message)}`,
    });
    Linking.openURL(smsUrl);
  };

  const handleCall = () => {
    Linking.openURL("tel:2892702031");
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
        isCanceled ? { opacity: 0.6 } : undefined,
      ]}
    >
      <View style={styles.header}>
        <Avatar name={tito.workerName} role="worker" size={28} />
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
        <View style={styles.badgeRow}>
          {isAdjusted ? (
            <View style={[styles.badge, { backgroundColor: "#F59E0B20" }]}>
              <Feather name="edit-2" size={10} color="#F59E0B" />
              <ThemedText style={[styles.badgeText, { color: "#F59E0B" }]}>Adjusted</ThemedText>
            </View>
          ) : null}
          <StatusPill status={isCanceled ? "cancelled" : tito.status} size="sm" />
        </View>
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

      {isAdminOrHR ? (
        <View style={styles.commsActions}>
          <Pressable
            onPress={handleText}
            style={[
              styles.commsBtn,
              { backgroundColor: theme.primary + "12" },
            ]}
            testID={`button-text-${tito.id}`}
          >
            <Feather name="message-circle" size={14} color={theme.primary} />
            <ThemedText style={[styles.commsText, { color: theme.primary }]}>
              Text
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={handleCall}
            style={[
              styles.commsBtn,
              { backgroundColor: theme.success + "12" },
            ]}
            testID={`button-call-${tito.id}`}
          >
            <Feather name="phone" size={14} color={theme.success} />
            <ThemedText style={[styles.commsText, { color: theme.success }]}>
              Call
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  headerInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  times: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  timeBlock: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: "500",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timeValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  timeText: {
    fontSize: 15,
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
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  actionBtnPrimary: {},
  actionText: {
    fontSize: 14,
    fontWeight: "600",
  },
  commsActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  commsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  commsText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
