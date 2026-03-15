import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useIsWideWeb } from "@/components/WebSidebarLayout";
import { apiRequest } from "@/lib/query-client";

type ConfigMap = Record<string, string>;

interface ConfigSetting {
  key: string;
  label: string;
  description: string;
  placeholder: string;
  sensitive?: boolean;
  icon: React.ComponentProps<typeof Feather>["name"];
}

const CONFIG_SETTINGS: ConfigSetting[] = [
  {
    key: "discord_webhook_url",
    label: "Discord Webhook URL",
    description: "Paste your Discord channel webhook URL. Clawd AI will send critical alerts (sick calls, client requests, urgent events) to this channel.",
    placeholder: "https://discordapp.com/api/webhooks/...",
    sensitive: true,
    icon: "bell",
  },
  {
    key: "discord_authorized_users",
    label: "Authorized Discord Users",
    description: "Comma-separated Discord user IDs allowed to trigger ClawdAI actions from Discord. Find your Discord user ID: User Settings > Advanced > enable Developer Mode, then right-click your name and Copy User ID. At least one ID is required for the bot to accept commands.",
    placeholder: "123456789012345678, 987654321098765432",
    sensitive: false,
    icon: "shield",
  },
];

function maskUrl(url: string): string {
  if (!url) return "";
  if (url.length <= 20) return "••••••••••";
  return url.slice(0, 32) + "•••••••••••••••••••••••••";
}

export default function SystemSettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const isWideWeb = useIsWideWeb();
  const queryClient = useQueryClient();

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [showValue, setShowValue] = useState<Record<string, boolean>>({});

  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? Spacing.lg : insets.top + Spacing.md;
  const wideStyle = isWideWeb ? { maxWidth: 680, alignSelf: "center" as const, width: "100%" as const } : undefined;

  const { data: config = {}, isLoading } = useQuery<ConfigMap>({
    queryKey: ["/api/config"],
  });

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await apiRequest("PUT", `/api/config/${key}`, { value });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
      setEditingKey(null);
      setEditingValue("");
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.message || "Failed to save setting");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await apiRequest("DELETE", `/api/config/${key}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/config"] });
    },
  });

  const handleEdit = useCallback((setting: ConfigSetting) => {
    setEditingKey(setting.key);
    setEditingValue(config[setting.key] || "");
  }, [config]);

  const handleSave = useCallback((key: string) => {
    const val = editingValue.trim();
    if (!val) {
      Alert.alert(
        "Clear Setting",
        "This will remove this setting. Are you sure?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", style: "destructive", onPress: () => { deleteMutation.mutate(key); setEditingKey(null); } },
        ]
      );
      return;
    }
    saveMutation.mutate({ key, value: val });
  }, [editingValue, saveMutation, deleteMutation]);

  const handleCancel = useCallback(() => {
    setEditingKey(null);
    setEditingValue("");
  }, []);

  const handleTest = useCallback(async (key: string) => {
    if (key === "discord_webhook_url") {
      const webhookUrl = config["discord_webhook_url"];
      if (!webhookUrl) {
        Alert.alert("No webhook configured", "Set the Discord webhook URL first.");
        return;
      }
      try {
        const res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: "WFConnect Clawd AI",
            embeds: [{
              title: "✅ Test Notification",
              description: "Your Discord webhook is configured correctly! WFConnect alerts will be sent here.",
              color: 0x22C55E,
              timestamp: new Date().toISOString(),
            }],
          }),
        });
        if (res.ok) {
          Alert.alert("Success!", "Test message sent to your Discord channel.");
        } else {
          Alert.alert("Failed", `Discord returned status ${res.status}. Check the webhook URL.`);
        }
      } catch (e: any) {
        Alert.alert("Error", "Could not reach Discord: " + (e?.message || "Unknown error"));
      }
    }
  }, [config]);

  const toggleShow = useCallback((key: string) => {
    setShowValue((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPadding, paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.inner, wideStyle]}>
          <ThemedText style={styles.pageTitle}>System Settings</ThemedText>
          <ThemedText style={[styles.pageSub, { color: theme.textSecondary }]}>
            Configure integrations and system-wide settings for WFConnect.
          </ThemedText>

          {isLoading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
          ) : (
            CONFIG_SETTINGS.map((setting) => {
              const currentVal = config[setting.key] || "";
              const isEditing = editingKey === setting.key;
              const isVisible = showValue[setting.key];
              const hasValue = !!currentVal;

              return (
                <Card key={setting.key} style={styles.settingCard}>
                  <View style={styles.settingHeader}>
                    <View style={[styles.settingIcon, { backgroundColor: theme.primary + "15" }]}>
                      <Feather name={setting.icon} size={20} color={theme.primary} />
                    </View>
                    <View style={styles.settingInfo}>
                      <ThemedText style={styles.settingLabel}>{setting.label}</ThemedText>
                      <View style={[styles.statusBadge, { backgroundColor: hasValue ? "#22C55E20" : "#F59E0B20" }]}>
                        <View style={[styles.statusDot, { backgroundColor: hasValue ? "#22C55E" : "#F59E0B" }]} />
                        <ThemedText style={[styles.statusText, { color: hasValue ? "#22C55E" : "#F59E0B" }]}>
                          {hasValue ? "Configured" : "Not set"}
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  <ThemedText style={[styles.settingDesc, { color: theme.textSecondary }]}>
                    {setting.description}
                  </ThemedText>

                  {hasValue && !isEditing ? (
                    <View style={[styles.valueRow, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                      <ThemedText style={[styles.valueText, { color: theme.textMuted }]} numberOfLines={1}>
                        {isVisible ? currentVal : maskUrl(currentVal)}
                      </ThemedText>
                      <Pressable onPress={() => toggleShow(setting.key)} style={styles.eyeBtn}>
                        <Feather name={isVisible ? "eye-off" : "eye"} size={16} color={theme.textMuted} />
                      </Pressable>
                    </View>
                  ) : null}

                  {isEditing ? (
                    <View style={styles.editArea}>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.primary }]}
                        value={editingValue}
                        onChangeText={setEditingValue}
                        placeholder={setting.placeholder}
                        placeholderTextColor={theme.textMuted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        multiline
                        numberOfLines={3}
                        testID={`input-${setting.key}`}
                      />
                      <View style={styles.editBtns}>
                        <Pressable onPress={handleCancel} style={[styles.btn, { backgroundColor: theme.backgroundSecondary }]}>
                          <ThemedText style={[styles.btnText, { color: theme.textSecondary }]}>Cancel</ThemedText>
                        </Pressable>
                        <Pressable
                          onPress={() => handleSave(setting.key)}
                          style={[styles.btn, { backgroundColor: theme.primary }]}
                          disabled={saveMutation.isPending}
                          testID={`save-${setting.key}`}
                        >
                          {saveMutation.isPending ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <ThemedText style={[styles.btnText, { color: "#fff" }]}>Save</ThemedText>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.actionRow}>
                      <Pressable
                        onPress={() => handleEdit(setting)}
                        style={[styles.actionBtn, { borderColor: theme.border }]}
                        testID={`edit-${setting.key}`}
                      >
                        <Feather name={hasValue ? "edit-2" : "plus"} size={14} color={theme.primary} />
                        <ThemedText style={[styles.actionBtnText, { color: theme.primary }]}>
                          {hasValue ? "Update" : "Set Webhook URL"}
                        </ThemedText>
                      </Pressable>
                      {hasValue ? (
                        <Pressable
                          onPress={() => handleTest(setting.key)}
                          style={[styles.actionBtn, { borderColor: "#22C55E50", backgroundColor: "#22C55E10" }]}
                          testID={`test-${setting.key}`}
                        >
                          <Feather name="send" size={14} color="#22C55E" />
                          <ThemedText style={[styles.actionBtnText, { color: "#22C55E" }]}>Test</ThemedText>
                        </Pressable>
                      ) : null}
                    </View>
                  )}

                  {setting.key === "discord_webhook_url" && !hasValue ? (
                    <View style={[styles.howToCard, { backgroundColor: theme.backgroundSecondary }]}>
                      <ThemedText style={[styles.howToTitle, { color: theme.text }]}>How to get your webhook URL:</ThemedText>
                      <ThemedText style={[styles.howToStep, { color: theme.textSecondary }]}>1. Open Discord → go to your server</ThemedText>
                      <ThemedText style={[styles.howToStep, { color: theme.textSecondary }]}>2. Right-click a channel → Edit Channel</ThemedText>
                      <ThemedText style={[styles.howToStep, { color: theme.textSecondary }]}>3. Go to Integrations → Webhooks → New Webhook</ThemedText>
                      <ThemedText style={[styles.howToStep, { color: theme.textSecondary }]}>4. Click "Copy Webhook URL" and paste it above</ThemedText>
                    </View>
                  ) : null}
                </Card>
              );
            })
          )}

          {/* Info card */}
          <Card style={{ ...styles.infoCard, backgroundColor: theme.primary + "08", borderColor: theme.primary + "20" }}>
            <Feather name="info" size={16} color={theme.primary} style={{ marginBottom: 8 }} />
            <ThemedText style={[styles.infoText, { color: theme.textSecondary }]}>
              Settings saved here take effect immediately. The Discord webhook URL is stored securely in the database and used by Clawd AI for real-time operational alerts.
            </ThemedText>
          </Card>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.lg },
  inner: {},
  pageTitle: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  pageSub: { fontSize: 14, marginBottom: Spacing.lg, lineHeight: 20 },
  settingCard: { padding: Spacing.md, marginBottom: Spacing.md },
  settingHeader: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.sm, marginBottom: Spacing.sm },
  settingIcon: { width: 44, height: 44, borderRadius: BorderRadius.lg, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  settingInfo: { flex: 1, gap: 4 },
  settingLabel: { fontSize: 16, fontWeight: "700" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: BorderRadius.full, alignSelf: "flex-start" },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "600" },
  settingDesc: { fontSize: 13, lineHeight: 19, marginBottom: Spacing.sm },
  valueRow: { flexDirection: "row", alignItems: "center", padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, marginBottom: Spacing.sm },
  valueText: { flex: 1, fontSize: 13, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  eyeBtn: { padding: 4 },
  editArea: { gap: Spacing.sm },
  input: { borderWidth: 1.5, borderRadius: BorderRadius.md, padding: Spacing.sm, fontSize: 14, minHeight: 80 },
  editBtns: { flexDirection: "row", gap: Spacing.sm },
  btn: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 14, fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: Spacing.sm },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.md, borderWidth: 1 },
  actionBtnText: { fontSize: 13, fontWeight: "600" },
  howToCard: { padding: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.sm, gap: 4 },
  howToTitle: { fontSize: 13, fontWeight: "700", marginBottom: 4 },
  howToStep: { fontSize: 13, lineHeight: 18 },
  infoCard: { padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, marginTop: 4 },
  infoText: { fontSize: 13, lineHeight: 19 },
});
