import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { getApiUrl } from "@/lib/query-client";
import { isWSConnected, getLastSyncTime, addWSListener } from "@/lib/websocket";
import { Spacing, BorderRadius } from "@/constants/theme";

type HealthData = {
  status: string;
  version: string;
  environment: string;
  dbIdentifier: string;
  wsClients: number;
  timestamp: string;
};

export default function DiagnosticsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(isWSConnected());
  const [lastSync, setLastSync] = useState(getLastSyncTime());

  useEffect(() => {
    const remove = addWSListener((connected) => {
      setWsConnected(connected);
      setLastSync(getLastSyncTime());
    });
    return () => { remove(); };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLastSync(getLastSyncTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/health`);
      const data = await res.json();
      setHealth(data);
    } catch (e: any) {
      setError(e.message || "Failed to fetch health data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const apiUrl = (() => {
    try { return getApiUrl(); } catch { return "Not configured"; }
  })();

  const renderRow = (label: string, value: string, icon: keyof typeof Feather.glyphMap, color?: string) => (
    <View style={[styles.row, { borderBottomColor: theme.border }]}>
      <View style={styles.rowLeft}>
        <Feather name={icon} size={16} color={theme.textSecondary} />
        <ThemedText style={[styles.rowLabel, { color: theme.textSecondary }]}>{label}</ThemedText>
      </View>
      <ThemedText style={[styles.rowValue, color ? { color } : undefined]}>{value}</ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
        ]}
      >
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Connection Status</ThemedText>
            <View style={[styles.statusDot, { backgroundColor: wsConnected ? "#22C55E" : "#EF4444" }]} />
          </View>
          {renderRow("WebSocket", wsConnected ? "Connected" : "Disconnected", "wifi", wsConnected ? "#22C55E" : "#EF4444")}
          {renderRow("Last Sync", lastSync ? new Date(lastSync).toLocaleTimeString() : "Never", "clock")}
          {renderRow("API Base URL", apiUrl, "link")}
        </Card>

        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Server Health</ThemedText>
            <Pressable onPress={fetchHealth} style={styles.refreshBtn}>
              <Feather name="refresh-cw" size={16} color={theme.primary} />
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: Spacing.lg }} />
          ) : error ? (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={16} color="#EF4444" />
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          ) : health ? (
            <>
              {renderRow("Status", health.status.toUpperCase(), "check-circle", health.status === "ok" ? "#22C55E" : "#EF4444")}
              {renderRow("Version", health.version, "tag")}
              {renderRow("Environment", health.environment, "server")}
              {renderRow("Database", health.dbIdentifier, "database")}
              {renderRow("WS Clients", String(health.wsClients), "users")}
              {renderRow("Server Time", new Date(health.timestamp).toLocaleString(), "clock")}
            </>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <ThemedText style={styles.sectionTitle}>About Sync</ThemedText>
          <ThemedText style={[styles.infoText, { color: theme.textSecondary }]}>
            Changes made on any device are broadcast via WebSocket to all connected clients in real time. When the app comes to the foreground or regains network, it automatically refreshes data.
          </ThemedText>
        </Card>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  refreshBtn: {
    padding: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowLabel: {
    fontSize: 14,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "600",
    maxWidth: "55%",
    textAlign: "right",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: Spacing.md,
    backgroundColor: "#FEE2E2",
    borderRadius: BorderRadius.sm,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    flex: 1,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
});
