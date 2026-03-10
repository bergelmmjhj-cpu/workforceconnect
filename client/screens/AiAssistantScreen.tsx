import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

type AssistantStatus = {
  running: boolean;
  paused: boolean;
  lastCycleAt: string | null;
  lastCycleError: string | null;
  cycleCount: number;
  cycleIntervalMinutes: number;
};

type ActionLog = {
  id: string;
  monitorType: string;
  signalId: string | null;
  signalSummary: string;
  actionTaken: string;
  alertSentTo: string | null;
  errorMessage: string | null;
  createdAt: string;
};

const MONITOR_LABELS: Record<string, string> = {
  contact_lead: "Contact Lead",
  shift_request: "Shift Request",
  unfilled_shift: "Unfilled Shift",
  pending_accounts_digest: "Pending Accounts",
  system: "System",
};

const ACTION_COLORS: Record<string, string> = {
  alert_sent: "#22C55E",
  skipped_already_alerted: "#94A3B8",
  skipped_rule: "#94A3B8",
  error: "#EF4444",
  activated: "#3B82F6",
  cycle_complete: "#64748B",
  paused: "#F59E0B",
  resumed: "#22C55E",
};

function formatTime(dateString: string | null | undefined): string {
  if (!dateString) return "Never";
  const d = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function formatActionTaken(action: string): string {
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AiAssistantScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const queryClient = useQueryClient();
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);

  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? Spacing.md : headerHeight + Spacing.md;

  const {
    data: status,
    isLoading: statusLoading,
    refetch: refetchStatus,
  } = useQuery<AssistantStatus>({ queryKey: ["/api/admin/ai-assistant/status"] });

  const {
    data: logs,
    isLoading: logsLoading,
    refetch: refetchLogs,
  } = useQuery<ActionLog[]>({ queryKey: ["/api/admin/ai-assistant/logs"] });

  const refetchAll = useCallback(async () => {
    await Promise.all([refetchStatus(), refetchLogs()]);
  }, [refetchStatus, refetchLogs]);

  const triggerMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/ai-assistant/trigger"),
    onSuccess: async () => {
      setTriggerMessage("Monitor cycle completed.");
      await refetchAll();
      setTimeout(() => setTriggerMessage(null), 4000);
    },
    onError: (err: any) => {
      setTriggerMessage(`Error: ${err?.message ?? "Failed to trigger cycle"}`);
      setTimeout(() => setTriggerMessage(null), 4000);
    },
  });

  const pauseMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/ai-assistant/pause"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-assistant/status"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-assistant/logs"] });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/ai-assistant/resume"),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-assistant/status"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-assistant/logs"] });
    },
  });

  const isAnyLoading = pauseMutation.isPending || resumeMutation.isPending || triggerMutation.isPending;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: topPadding, paddingBottom: insets.bottom + Spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={statusLoading || logsLoading}
            onRefresh={refetchAll}
            tintColor={theme.primary}
          />
        }
      >
        <View style={styles.headerSection}>
          <ThemedText style={styles.sectionTitle}>AI Operations Assistant</ThemedText>
          <ThemedText style={styles.sectionSubtitle}>
            Automated monitoring for leads, shifts, and accounts
          </ThemedText>
        </View>

        {/* Status Card */}
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusTitleRow}>
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      status?.paused
                        ? "#F59E0B"
                        : status?.running
                        ? "#22C55E"
                        : "#EF4444",
                  },
                ]}
              />
              <ThemedText style={styles.statusTitle}>
                {status?.paused ? "Paused" : status?.running ? "Active" : "Stopped"}
              </ThemedText>
            </View>
            <Pressable
              onPress={refetchAll}
              style={({ pressed }) => [styles.refreshBtn, { opacity: pressed ? 0.6 : 1 }]}
              testID="button-refresh-status"
            >
              <Feather name="refresh-cw" size={16} color={theme.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.statusGrid}>
            <View style={styles.statusCell}>
              <ThemedText style={styles.statLabel}>Cycles Run</ThemedText>
              <ThemedText style={styles.statValue}>{status?.cycleCount ?? 0}</ThemedText>
            </View>
            <View style={styles.statusCell}>
              <ThemedText style={styles.statLabel}>Interval</ThemedText>
              <ThemedText style={styles.statValue}>
                {status?.cycleIntervalMinutes ?? 5} min
              </ThemedText>
            </View>
            <View style={styles.statusCell}>
              <ThemedText style={styles.statLabel}>Last Cycle</ThemedText>
              <ThemedText style={styles.statValue}>
                {formatTime(status?.lastCycleAt)}
              </ThemedText>
            </View>
          </View>

          {status?.lastCycleError ? (
            <View style={[styles.errorBanner, { backgroundColor: "#EF444420" }]}>
              <Feather name="alert-circle" size={14} color="#EF4444" />
              <ThemedText style={[styles.errorText, { color: "#EF4444" }]}>
                {status.lastCycleError}
              </ThemedText>
            </View>
          ) : null}
        </Card>

        {/* Controls */}
        <View style={styles.controlsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.controlBtn,
              { backgroundColor: theme.primary, opacity: pressed || isAnyLoading ? 0.7 : 1 },
            ]}
            onPress={() => triggerMutation.mutate()}
            disabled={isAnyLoading}
            testID="button-trigger-cycle"
          >
            {triggerMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="zap" size={16} color="#fff" />
            )}
            <ThemedText style={styles.controlBtnText}>Run Now</ThemedText>
          </Pressable>

          {status?.paused ? (
            <Pressable
              style={({ pressed }) => [
                styles.controlBtn,
                { backgroundColor: "#22C55E", opacity: pressed || isAnyLoading ? 0.7 : 1 },
              ]}
              onPress={() => resumeMutation.mutate()}
              disabled={isAnyLoading}
              testID="button-resume"
            >
              {resumeMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="play" size={16} color="#fff" />
              )}
              <ThemedText style={styles.controlBtnText}>Resume</ThemedText>
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.controlBtn,
                { backgroundColor: "#F59E0B", opacity: pressed || isAnyLoading ? 0.7 : 1 },
              ]}
              onPress={() => pauseMutation.mutate()}
              disabled={isAnyLoading}
              testID="button-pause"
            >
              {pauseMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Feather name="pause" size={16} color="#fff" />
              )}
              <ThemedText style={styles.controlBtnText}>Pause</ThemedText>
            </Pressable>
          )}
        </View>

        {triggerMessage ? (
          <View style={[styles.triggerBanner, { backgroundColor: theme.primary + "20" }]}>
            <ThemedText style={[styles.triggerText, { color: theme.primary }]}>
              {triggerMessage}
            </ThemedText>
          </View>
        ) : null}

        {/* Rules Legend */}
        <Card style={styles.rulesCard}>
          <ThemedText style={styles.rulesTitle}>Monitored Signals</ThemedText>
          {[
            { icon: "mail" as const, label: "New contact form submission", detail: "Alerts immediately" },
            { icon: "clock" as const, label: "Shift request open 30 min+", detail: "First reminder" },
            { icon: "alert-triangle" as const, label: "Shift request open 4 h+", detail: "Escalation alert" },
            { icon: "user-x" as const, label: "Unfilled shift within 4 h", detail: "Urgent — assign worker" },
            { icon: "users" as const, label: "Pending accounts", detail: "Daily 9 AM digest" },
          ].map((rule, i) => (
            <View key={i} style={styles.ruleRow}>
              <Feather name={rule.icon} size={15} color={theme.primary} style={styles.ruleIcon} />
              <View style={styles.ruleText}>
                <ThemedText style={styles.ruleLabel}>{rule.label}</ThemedText>
                <ThemedText style={styles.ruleDetail}>{rule.detail}</ThemedText>
              </View>
            </View>
          ))}
        </Card>

        {/* Action Log */}
        <ThemedText style={styles.logTitle}>Action Log</ThemedText>

        {logsLoading ? (
          <ActivityIndicator color={theme.primary} style={styles.loader} />
        ) : logs && logs.length > 0 ? (
          logs.map((log) => (
            <Card key={log.id} style={styles.logCard}>
              <View style={styles.logHeader}>
                <View style={styles.logBadgeRow}>
                  <View
                    style={[
                      styles.logBadge,
                      { backgroundColor: (ACTION_COLORS[log.actionTaken] ?? "#94A3B8") + "25" },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.logBadgeText,
                        { color: ACTION_COLORS[log.actionTaken] ?? "#94A3B8" },
                      ]}
                    >
                      {formatActionTaken(log.actionTaken)}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.logTypeBadge,
                      { backgroundColor: theme.primary + "15" },
                    ]}
                  >
                    <ThemedText style={[styles.logTypeBadgeText, { color: theme.primary }]}>
                      {MONITOR_LABELS[log.monitorType] ?? log.monitorType}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.logTime}>{formatTime(log.createdAt)}</ThemedText>
              </View>
              <ThemedText style={styles.logSummary}>{log.signalSummary}</ThemedText>
              {log.alertSentTo && log.actionTaken === "alert_sent" ? (
                <ThemedText style={styles.logMeta}>Email sent to {log.alertSentTo}</ThemedText>
              ) : null}
              {log.errorMessage ? (
                <ThemedText style={[styles.logMeta, { color: "#EF4444" }]}>
                  {log.errorMessage}
                </ThemedText>
              ) : null}
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <Feather name="activity" size={32} color={theme.textSecondary} style={styles.emptyIcon} />
            <ThemedText style={styles.emptyText}>No actions logged yet.</ThemedText>
            <ThemedText style={styles.emptySubtext}>
              The assistant will begin monitoring when it starts its first cycle.
            </ThemedText>
          </Card>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  contentContainer: { paddingHorizontal: Spacing.lg },
  headerSection: { marginBottom: Spacing.md },
  sectionTitle: { fontSize: 22, fontWeight: "700", marginBottom: 2 },
  sectionSubtitle: { fontSize: 13, opacity: 0.6 },
  statusCard: { padding: Spacing.md, marginBottom: Spacing.sm },
  statusHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.sm },
  statusTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusTitle: { fontSize: 16, fontWeight: "600" },
  refreshBtn: { padding: 4 },
  statusGrid: { flexDirection: "row", gap: Spacing.sm },
  statusCell: { flex: 1, alignItems: "center" },
  statLabel: { fontSize: 11, opacity: 0.55, marginBottom: 2 },
  statValue: { fontSize: 15, fontWeight: "600" },
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 6, padding: Spacing.sm, borderRadius: 8, marginTop: Spacing.sm },
  errorText: { fontSize: 12, flex: 1 },
  controlsRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.sm },
  controlBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 10 },
  controlBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  triggerBanner: { padding: Spacing.sm, borderRadius: 8, marginBottom: Spacing.sm },
  triggerText: { fontSize: 13, fontWeight: "500", textAlign: "center" },
  rulesCard: { padding: Spacing.md, marginBottom: Spacing.md },
  rulesTitle: { fontSize: 14, fontWeight: "600", marginBottom: Spacing.sm },
  ruleRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: Spacing.xs },
  ruleIcon: { marginTop: 1, marginRight: Spacing.sm, width: 20 },
  ruleText: { flex: 1 },
  ruleLabel: { fontSize: 13, fontWeight: "500" },
  ruleDetail: { fontSize: 11, opacity: 0.55 },
  logTitle: { fontSize: 16, fontWeight: "700", marginBottom: Spacing.sm },
  loader: { marginTop: Spacing.lg },
  logCard: { padding: Spacing.sm, marginBottom: Spacing.sm },
  logHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 },
  logBadgeRow: { flexDirection: "row", gap: 6, flex: 1 },
  logBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  logBadgeText: { fontSize: 11, fontWeight: "600" },
  logTypeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  logTypeBadgeText: { fontSize: 11, fontWeight: "500" },
  logTime: { fontSize: 11, opacity: 0.5, marginLeft: 4 },
  logSummary: { fontSize: 13, lineHeight: 18 },
  logMeta: { fontSize: 11, opacity: 0.65, marginTop: 2 },
  emptyCard: { padding: Spacing.xl, alignItems: "center" },
  emptyIcon: { marginBottom: Spacing.sm },
  emptyText: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  emptySubtext: { fontSize: 12, opacity: 0.55, textAlign: "center" },
});
