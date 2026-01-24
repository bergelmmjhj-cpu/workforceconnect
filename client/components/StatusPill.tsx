import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";
import { RequestStatus, ShiftStatus, TitoApprovalStatus } from "@/types";

type StatusType = RequestStatus | ShiftStatus | TitoApprovalStatus | "sla_warning" | "sla_breach";

interface StatusPillProps {
  status: StatusType;
  size?: "sm" | "md";
}

const statusLabels: Record<StatusType, string> = {
  draft: "Draft",
  submitted: "Submitted",
  reviewing: "Reviewing",
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  scheduled: "Scheduled",
  pending: "Pending",
  approved: "Approved",
  disputed: "Disputed",
  sla_warning: "SLA Warning",
  sla_breach: "SLA Breach",
};

export function StatusPill({ status, size = "md" }: StatusPillProps) {
  const { theme } = useTheme();

  const getColors = () => {
    switch (status) {
      case "draft":
        return { bg: theme.statusDraft + "20", text: theme.statusDraft };
      case "submitted":
      case "scheduled":
        return { bg: theme.statusSubmitted + "20", text: theme.statusSubmitted };
      case "reviewing":
      case "pending":
        return { bg: theme.accent + "20", text: theme.accent };
      case "assigned":
      case "in_progress":
        return { bg: theme.statusInProgress + "20", text: theme.statusInProgress };
      case "completed":
      case "approved":
        return { bg: theme.success + "20", text: theme.success };
      case "cancelled":
      case "disputed":
      case "sla_breach":
        return { bg: theme.error + "20", text: theme.error };
      case "sla_warning":
        return { bg: theme.warning + "20", text: theme.warning };
      default:
        return { bg: theme.textMuted + "20", text: theme.textMuted };
    }
  };

  const colors = getColors();

  return (
    <View
      style={[
        styles.pill,
        size === "sm" ? styles.pillSm : styles.pillMd,
        { backgroundColor: colors.bg },
      ]}
    >
      <ThemedText
        style={[
          size === "sm" ? styles.textSm : styles.textMd,
          { color: colors.text },
        ]}
      >
        {statusLabels[status] || status}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    borderRadius: BorderRadius.full,
  },
  pillSm: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  pillMd: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
  },
  textSm: {
    fontSize: 11,
    fontWeight: "600",
  },
  textMd: {
    fontSize: 12,
    fontWeight: "600",
  },
});
