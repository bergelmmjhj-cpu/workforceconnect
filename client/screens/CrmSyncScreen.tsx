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
import { Spacing, Layout } from "@/constants/theme";
import { useIsWideWeb } from "@/components/WebSidebarLayout";
import { apiRequest } from "@/lib/query-client";

type SyncResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  errorMessages: string[];
};

type SyncStatus = {
  configured: boolean;
  connected: boolean;
  connectionError?: string;
  lastSyncError: string | null;
  syncRunning: boolean;
  lastSyncs: Record<
    string,
    {
      status: string;
      startedAt: string;
      completedAt: string;
      created: number;
      updated: number;
      skipped: number;
      errors: number;
      dryRun: boolean;
    }
  >;
};

type SyncLog = {
  id: string;
  syncType: string;
  status: string;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  errorMessages: string | null;
  dryRun: boolean;
  startedAt: string;
  completedAt: string | null;
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

function StatusDot({ connected }: { connected: boolean }) {
  return (
    <View
      style={[
        styles.statusDot,
        { backgroundColor: connected ? "#34C759" : "#FF3B30" },
      ]}
    />
  );
}

export default function CrmSyncScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const isWeb = Platform.OS === "web";
  const isWideWeb = useIsWideWeb();
  const queryClient = useQueryClient();
  const [lastResult, setLastResult] = useState<{
    workplaces?: SyncResult;
    shifts?: SyncResult;
    hotelRequests?: SyncResult;
    totalCreated?: number;
    totalUpdated?: number;
    totalErrors?: number;
  } | null>(null);

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery<SyncStatus>({
    queryKey: ["/api/admin/sync/status"],
    refetchInterval: 10000,
  });

  const { data: logs, refetch: refetchLogs } = useQuery<SyncLog[]>({
    queryKey: ["/api/admin/sync/logs"],
  });

  const syncAllMutation = useMutation({
    mutationFn: async (dryRun: boolean) => {
      const res = await apiRequest(
        "POST",
        `/api/admin/sync/all${dryRun ? "?dryRun=true" : ""}`
      );
      return res.json();
    },
    onSuccess: (data) => {
      setLastResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sync/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sync/logs"] });
    },
  });

  const syncTypeMutation = useMutation({
    mutationFn: async ({ type, dryRun }: { type: string; dryRun: boolean }) => {
      const res = await apiRequest(
        "POST",
        `/api/admin/sync/${type}${dryRun ? "?dryRun=true" : ""}`
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sync/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sync/logs"] });
    },
  });

  const isSyncing = syncAllMutation.isPending || syncTypeMutation.isPending || (status?.syncRunning ?? false);

  const onRefresh = useCallback(() => {
    refetchStatus();
    refetchLogs();
  }, [refetchStatus, refetchLogs]);

  const renderSyncCategory = (
    label: string,
    type: string,
    icon: keyof typeof Feather.glyphMap
  ) => {
    const lastSync = status?.lastSyncs?.[type];
    return (
      <Card style={styles.categoryCard} key={type}>
        <View style={styles.categoryHeader}>
          <View style={[styles.categoryIcon, { backgroundColor: theme.primary + "15" }]}>
            <Feather name={icon} size={18} color={theme.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.categoryLabel}>{label}</ThemedText>
            <ThemedText style={[styles.categoryTime, { color: theme.textSecondary }]}>
              {lastSync ? formatTime(lastSync.completedAt || lastSync.startedAt) : "Never synced"}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => syncTypeMutation.mutate({ type, dryRun: false })}
            disabled={isSyncing}
            style={[styles.miniSyncBtn, { borderColor: theme.border }]}
          >
            <Feather name="refresh-cw" size={14} color={theme.primary} />
          </Pressable>
        </View>
        {lastSync ? (
          <View style={styles.categoryStats}>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statValue, { color: "#34C759" }]}>
                {lastSync.created}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                Created
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statValue, { color: "#007AFF" }]}>
                {lastSync.updated}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                Updated
              </ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statValue, { color: theme.textSecondary }]}>
                {lastSync.skipped}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                Skipped
              </ThemedText>
            </View>
            {lastSync.errors > 0 ? (
              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: "#FF3B30" }]}>
                  {lastSync.errors}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Errors
                </ThemedText>
              </View>
            ) : null}
          </View>
        ) : null}
      </Card>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: isWeb ? Spacing.md : headerHeight + Spacing.md,
            paddingBottom: insets.bottom + Spacing.lg,
          },
          isWideWeb && { maxWidth: Layout.listMaxWidth, alignSelf: 'center', width: '100%' },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={onRefresh} />
        }
      >
        <Card style={styles.connectionCard}>
          <View style={styles.connectionRow}>
            <StatusDot connected={status?.connected ?? false} />
            <View style={{ flex: 1, marginLeft: Spacing.sm }}>
              <ThemedText style={styles.connectionTitle}>
                CRM Connection
              </ThemedText>
              <ThemedText
                style={[styles.connectionStatus, { color: theme.textSecondary }]}
              >
                {statusLoading
                  ? "Checking..."
                  : status?.connected
                  ? "Connected to Weekdays CRM"
                  : status?.connectionError || "Not connected"}
              </ThemedText>
            </View>
            {status?.configured ? (
              <View
                style={[
                  styles.configBadge,
                  {
                    backgroundColor: status.connected
                      ? "#34C75920"
                      : "#FF3B3020",
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.configBadgeText,
                    { color: status.connected ? "#34C759" : "#FF3B30" },
                  ]}
                >
                  {status.connected ? "Active" : "Error"}
                </ThemedText>
              </View>
            ) : (
              <View style={[styles.configBadge, { backgroundColor: "#FF950020" }]}>
                <ThemedText style={[styles.configBadgeText, { color: "#FF9500" }]}>
                  Not Configured
                </ThemedText>
              </View>
            )}
          </View>
        </Card>

        {status?.lastSyncError ? (
          <Card style={[styles.errorCard, { backgroundColor: "#FF3B3010" }]}>
            <View style={styles.errorRow}>
              <Feather name="alert-triangle" size={18} color="#FF3B30" />
              <ThemedText style={styles.errorText}>
                {status.lastSyncError}
              </ThemedText>
            </View>
          </Card>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable
            onPress={() => syncAllMutation.mutate(false)}
            disabled={isSyncing || !status?.connected}
            style={[
              styles.syncButton,
              {
                backgroundColor: isSyncing || !status?.connected
                  ? theme.border
                  : theme.primary,
              },
            ]}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="refresh-cw" size={18} color="#fff" />
            )}
            <ThemedText style={styles.syncButtonText}>
              {isSyncing ? "Syncing..." : "Sync All Now"}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => syncAllMutation.mutate(true)}
            disabled={isSyncing || !status?.connected}
            style={[
              styles.previewButton,
              {
                borderColor: isSyncing || !status?.connected
                  ? theme.border
                  : theme.primary,
              },
            ]}
          >
            <Feather
              name="eye"
              size={18}
              color={isSyncing || !status?.connected ? theme.textSecondary : theme.primary}
            />
            <ThemedText
              style={[
                styles.previewButtonText,
                {
                  color: isSyncing || !status?.connected
                    ? theme.textSecondary
                    : theme.primary,
                },
              ]}
            >
              Preview
            </ThemedText>
          </Pressable>
        </View>

        {lastResult ? (
          <Card style={styles.resultCard}>
            <ThemedText style={styles.resultTitle}>
              {syncAllMutation.variables === true ? "Preview Results (Dry Run)" : "Sync Results"}
            </ThemedText>
            <View style={styles.resultRow}>
              <ThemedText style={[styles.resultStat, { color: "#34C759" }]}>
                {lastResult.totalCreated ?? 0} created
              </ThemedText>
              <ThemedText style={[styles.resultStat, { color: "#007AFF" }]}>
                {lastResult.totalUpdated ?? 0} updated
              </ThemedText>
              {(lastResult.totalErrors ?? 0) > 0 ? (
                <ThemedText style={[styles.resultStat, { color: "#FF3B30" }]}>
                  {lastResult.totalErrors} errors
                </ThemedText>
              ) : null}
            </View>
          </Card>
        ) : null}

        <ThemedText style={styles.sectionHeader}>Sync Categories</ThemedText>

        {renderSyncCategory("Workplaces", "workplaces", "map-pin")}
        {renderSyncCategory("Confirmed Shifts", "shifts", "calendar")}
        {renderSyncCategory("Hotel Requests", "hotel-requests", "briefcase")}

        <ThemedText style={styles.sectionHeader}>Recent Sync History</ThemedText>

        {logs && logs.length > 0 ? (
          logs.slice(0, 20).map((log) => (
            <Card style={styles.logCard} key={log.id}>
              <View style={styles.logRow}>
                <View
                  style={[
                    styles.logStatusDot,
                    {
                      backgroundColor:
                        log.status === "completed"
                          ? "#34C759"
                          : log.status === "failed"
                          ? "#FF3B30"
                          : "#FF9500",
                    },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.logType}>
                    {log.syncType.charAt(0).toUpperCase() + log.syncType.slice(1)}
                    {log.dryRun ? " (Preview)" : ""}
                  </ThemedText>
                  <ThemedText style={[styles.logTime, { color: theme.textSecondary }]}>
                    {formatTime(log.startedAt)}
                  </ThemedText>
                </View>
                <View style={styles.logStats}>
                  {log.createdCount > 0 ? (
                    <ThemedText style={[styles.logStat, { color: "#34C759" }]}>
                      +{log.createdCount}
                    </ThemedText>
                  ) : null}
                  {log.updatedCount > 0 ? (
                    <ThemedText style={[styles.logStat, { color: "#007AFF" }]}>
                      ~{log.updatedCount}
                    </ThemedText>
                  ) : null}
                  {log.errorCount > 0 ? (
                    <ThemedText style={[styles.logStat, { color: "#FF3B30" }]}>
                      !{log.errorCount}
                    </ThemedText>
                  ) : null}
                </View>
              </View>
            </Card>
          ))
        ) : (
          <Card style={styles.emptyCard}>
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              No sync history yet
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
  connectionCard: { padding: Spacing.md, marginBottom: Spacing.md },
  connectionRow: { flexDirection: "row", alignItems: "center" },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  connectionTitle: { fontSize: 16, fontWeight: "600" },
  connectionStatus: { fontSize: 13, marginTop: 2 },
  configBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  configBadgeText: { fontSize: 12, fontWeight: "600" },
  errorCard: { padding: Spacing.md, marginBottom: Spacing.md },
  errorRow: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm },
  errorText: { flex: 1, fontSize: 13, color: "#FF3B30" },
  actionRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  syncButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  syncButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  previewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  previewButtonText: { fontWeight: "600", fontSize: 15 },
  resultCard: { padding: Spacing.md, marginBottom: Spacing.lg },
  resultTitle: { fontSize: 15, fontWeight: "600", marginBottom: Spacing.sm },
  resultRow: { flexDirection: "row", gap: Spacing.md },
  resultStat: { fontSize: 14, fontWeight: "500" },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  categoryCard: { padding: Spacing.md, marginBottom: Spacing.sm },
  categoryHeader: { flexDirection: "row", alignItems: "center" },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  categoryLabel: { fontSize: 15, fontWeight: "600" },
  categoryTime: { fontSize: 12, marginTop: 1 },
  miniSyncBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryStats: {
    flexDirection: "row",
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#0001",
    gap: Spacing.lg,
  },
  statItem: { alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 11, marginTop: 2 },
  logCard: { padding: Spacing.sm, marginBottom: 6 },
  logRow: { flexDirection: "row", alignItems: "center" },
  logStatusDot: { width: 8, height: 8, borderRadius: 4, marginRight: Spacing.sm },
  logType: { fontSize: 14, fontWeight: "500" },
  logTime: { fontSize: 12 },
  logStats: { flexDirection: "row", gap: 8 },
  logStat: { fontSize: 13, fontWeight: "600" },
  emptyCard: { padding: Spacing.lg, alignItems: "center" },
  emptyText: { fontSize: 14 },
});
