import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Platform,
  Clipboard,
  Alert,
  Image,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Layout, BorderRadius } from "@/constants/theme";
import { useIsWideWeb } from "@/components/WebSidebarLayout";
import { apiRequest } from "@/lib/query-client";

type ToolCall = {
  toolName: string;
  input: Record<string, unknown>;
  result: unknown;
  success: boolean;
  error?: string;
};

type MessageMetadata = {
  assistantsInvoked?: string[];
  overallSeverity?: number;
  isActionMode?: boolean;
  toolCalls?: ToolCall[];
  metadata?: { totalDurationMs?: number; model?: string };
};

type ClawdMessage = {
  id: string;
  userId: string;
  role: string;
  content: string;
  metadata: string | null;
  createdAt: string;
};

type DiscordAlert = {
  id: string;
  alertId: string;
  type: string;
  title: string;
  message: string;
  sourcePhone: string | null;
  sourceWorkerId: string | null;
  status: string;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  responseNote: string | null;
  actionsTaken: string | null;
  createdAt: string;
};

type OrchestrationResponse = {
  response: string;
  assistantsInvoked: string[];
  overallSeverity: number;
  isActionMode?: boolean;
  toolCalls?: ToolCall[];
  metadata: { totalDurationMs: number; model: string };
};

type AssistantRun = {
  id: string;
  chatMessageId: string | null;
  assistantType: string;
  inputContext: string | null;
  outputFindings: string | null;
  durationMs: number | null;
  userId: string | null;
  createdAt: string;
};

type TabKey = "chat" | "briefing" | "alerts" | "insights" | "announce";

const TABS: { key: TabKey; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
  { key: "chat", label: "Chat", icon: "message-circle" },
  { key: "briefing", label: "Briefing", icon: "file-text" },
  { key: "alerts", label: "Alerts", icon: "bell" },
  { key: "insights", label: "Insights", icon: "bar-chart-2" },
  { key: "announce", label: "Announce", icon: "send" },
];

const QUICK_PROMPTS = [
  "What should I worry about today?",
  "Executive summary",
  "Read recent incoming SMS",
  "Check Discord alerts",
  "Find available workers",
];

const ASSISTANT_TYPES = ["all", "staffing", "attendance", "recruitment", "payroll", "client_risk"];

const INSIGHT_CARDS = [
  { type: "staffing", label: "Staffing", icon: "users" as const, query: "Staffing Intelligence: Give me current staffing analysis" },
  { type: "attendance", label: "Attendance", icon: "clock" as const, query: "Attendance Intelligence: Give me current attendance analysis" },
  { type: "recruitment", label: "Recruitment", icon: "user-plus" as const, query: "Recruitment Intelligence: Give me current recruitment analysis" },
  { type: "payroll", label: "Payroll", icon: "dollar-sign" as const, query: "Payroll Intelligence: Give me current payroll analysis" },
  { type: "client_risk", label: "Client Risk", icon: "alert-triangle" as const, query: "Client Risk Intelligence: Give me current client risk analysis" },
];

const TOOL_ICONS: Record<string, React.ComponentProps<typeof Feather>["name"]> = {
  send_sms: "message-circle",
  notify_gm_lilee: "phone",
  send_discord_notification: "bell",
  send_worker_internal_message: "mail",
  assign_worker_to_shift: "user-check",
  blast_shift_to_workers: "radio",
  create_shift_request: "plus-circle",
  create_workplace: "plus-square",
  update_workplace: "edit-3",
  create_calendar_event: "calendar",
  list_calendar_events: "calendar",
  send_email_gmail: "mail",
  read_recent_emails: "inbox",
  generate_replit_prompt: "code",
  find_available_workers: "users",
  lookup_workers: "search",
  lookup_shifts: "calendar",
  lookup_workplaces: "map-pin",
  lookup_shift_requests: "clipboard",
  read_recent_sms: "message-square",
  check_discord_alerts: "bell",
};

const ACTION_TOOL_NAMES = new Set([
  "send_sms", "notify_gm_lilee", "send_discord_notification",
  "send_worker_internal_message", "assign_worker_to_shift",
  "blast_shift_to_workers", "create_shift_request", "create_workplace",
  "update_workplace", "generate_replit_prompt",
  "create_calendar_event", "send_email_gmail",
]);

function formatTimeAgo(dateString: string | null | undefined): string {
  if (!dateString) return "Never";
  const d = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function getSeverityColor(severity: number): string {
  if (severity > 0.7) return "#EF4444";
  if (severity > 0.4) return "#F59E0B";
  return "#22C55E";
}

function getAlertTypeColor(type: string): string {
  switch (type) {
    case "sick_call": return "#EF4444";
    case "client_request": return "#3B82F6";
    case "urgent_shift": return "#F59E0B";
    case "auto_coverage": return "#22C55E";
    default: return "#8B5CF6";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "pending": return "#F59E0B";
    case "acknowledged": return "#22C55E";
    case "resolved": return "#6B7280";
    default: return "#6B7280";
  }
}

function parseMetadata(raw: string | null): MessageMetadata | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function copyToClipboard(text: string) {
  if (Platform.OS === "web") {
    navigator.clipboard?.writeText(text).catch(() => {});
  } else {
    Clipboard.setString(text);
  }
}

function renderInlineMd(text: string, color: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <Text key={i} style={{ fontWeight: "700", color }}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    return (
      <Text key={i} style={{ color }}>
        {part}
      </Text>
    );
  });
}

function SimpleMarkdown({ content, textColor }: { content: string; textColor: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let tableLines: string[] = [];
  let key = 0;

  const flushCodeBlock = () => {
    elements.push(
      <View
        key={key++}
        style={{ backgroundColor: "rgba(0,0,0,0.08)", padding: 8, borderRadius: 6, marginVertical: 4 }}
      >
        <Text
          selectable
          style={{
            fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
            fontSize: 12,
            color: textColor,
            lineHeight: 18,
          }}
        >
          {codeLines.join("\n")}
        </Text>
      </View>
    );
    codeLines = [];
    inCodeBlock = false;
  };

  const flushTable = () => {
    if (tableLines.length < 2) {
      tableLines.forEach(tl => {
        elements.push(
          <Text key={key++} style={{ fontSize: 13, color: textColor, lineHeight: 20 }}>{tl}</Text>
        );
      });
      tableLines = [];
      return;
    }
    // Parse header + separator + rows
    const parseCells = (row: string) =>
      row.split("|").map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

    const headerCells = parseCells(tableLines[0]);
    const sepIdx = tableLines.findIndex((tl, i) => i > 0 && isSeparatorLine(tl));
    const dataRows = tableLines.slice(sepIdx >= 0 ? sepIdx + 1 : 1).map(parseCells);

    // Use a minimum cell width and wrap in horizontal ScrollView for wide tables
    const isWide = headerCells.length >= 4;
    const maxCellContent = Math.max(...headerCells.map(c => c.length), ...dataRows.flat().map(c => (c || "").length));
    const cellMinWidth = isWide ? Math.max(90, Math.min(maxCellContent * 8, 200)) : 0;

    const tableContent = (
      <View style={{ borderRadius: 6, overflow: "hidden", borderWidth: 1, borderColor: "rgba(0,0,0,0.12)", minWidth: isWide ? headerCells.length * cellMinWidth : undefined }}>
        {/* Header row */}
        <View style={{ flexDirection: "row", backgroundColor: "rgba(0,0,0,0.10)" }}>
          {headerCells.map((cell, ci) => (
            <View key={ci} style={{ flex: isWide ? undefined : 1, width: isWide ? cellMinWidth : undefined, padding: 7, borderRightWidth: ci < headerCells.length - 1 ? 1 : 0, borderColor: "rgba(0,0,0,0.12)" }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: textColor }}>{cell}</Text>
            </View>
          ))}
        </View>
        {/* Data rows */}
        {dataRows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: "row", backgroundColor: ri % 2 === 0 ? "transparent" : "rgba(0,0,0,0.04)" }}>
            {headerCells.map((_, ci) => (
              <View key={ci} style={{ flex: isWide ? undefined : 1, width: isWide ? cellMinWidth : undefined, padding: 7, borderRightWidth: ci < headerCells.length - 1 ? 1 : 0, borderTopWidth: 1, borderColor: "rgba(0,0,0,0.12)" }}>
                <Text selectable style={{ fontSize: 12, color: textColor }}>{row[ci] ?? ""}</Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    );

    elements.push(
      isWide ? (
        <ScrollView key={key++} horizontal showsHorizontalScrollIndicator={true} style={{ marginVertical: 6 }}>
          {tableContent}
        </ScrollView>
      ) : (
        <View key={key++} style={{ marginVertical: 6 }}>
          {tableContent}
        </View>
      )
    );
    tableLines = [];
  };

  const isTableLine = (line: string) => {
    const trimmed = line.trim();
    return trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.split("|").length >= 3;
  };
  const isSeparatorLine = (line: string) => /^\s*\|[\s\-:| ]+\|\s*$/.test(line);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith("```")) {
      if (tableLines.length > 0) flushTable();
      if (inCodeBlock) {
        flushCodeBlock();
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Table detection
    if (isTableLine(line)) {
      tableLines.push(line);
      continue;
    } else if (tableLines.length > 0) {
      flushTable();
    }

    if (line.trim() === "") {
      elements.push(<View key={key++} style={{ height: 5 }} />);
      continue;
    }

    if (line.trim() === "---" || line.trim() === "***") {
      elements.push(
        <View key={key++} style={{ height: 1, backgroundColor: "rgba(0,0,0,0.12)", marginVertical: 6 }} />
      );
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const fontSize = level === 1 ? 17 : level === 2 ? 15 : 14;
      elements.push(
        <Text key={key++} style={{ fontSize, fontWeight: "700", color: textColor, marginTop: 8, marginBottom: 2, lineHeight: fontSize + 6 }}>
          {renderInlineMd(text, textColor)}
        </Text>
      );
      continue;
    }

    const bulletMatch = line.match(/^(\s*)([-*•])\s+(.+)/);
    if (bulletMatch) {
      const indent = bulletMatch[1].length * 8;
      const text = bulletMatch[3];
      elements.push(
        <View key={key++} style={{ flexDirection: "row", marginVertical: 1, paddingLeft: indent }}>
          <Text style={{ color: textColor, marginRight: 6, fontSize: 14, lineHeight: 20 }}>{"•"}</Text>
          <Text style={{ flex: 1, fontSize: 14, color: textColor, lineHeight: 20 }}>
            {renderInlineMd(text, textColor)}
          </Text>
        </View>
      );
      continue;
    }

    elements.push(
      <Text key={key++} style={{ fontSize: 14, color: textColor, lineHeight: 21 }}>
        {renderInlineMd(line, textColor)}
      </Text>
    );
  }

  if (inCodeBlock && codeLines.length > 0) {
    flushCodeBlock();
  }
  if (tableLines.length > 0) {
    flushTable();
  }

  return <>{elements}</>;
}

export default function ClawdWorkspaceScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const isWideWeb = useIsWideWeb();
  const queryClient = useQueryClient();
  const navigation = useNavigation();

  const [activeTab, setActiveTab] = useState<TabKey>("chat");
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [alertFilter, setAlertFilter] = useState("all");
  const [alertsTab, setAlertsTab] = useState<"runs" | "discord">("discord");
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);

  const [announceDraft, setAnnounceDraft] = useState("");
  const [announcePreview, setAnnouncePreview] = useState<{ title: string; body: string; color: string } | null>(null);
  const [announcePreviewing, setAnnouncePreviewing] = useState(false);
  const [announceSending, setAnnounceSending] = useState(false);
  const [announceSent, setAnnounceSent] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const prevMessageCountRef = useRef(0);

  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? Spacing.md : headerHeight + Spacing.md;

  const wideStyle = isWideWeb ? { maxWidth: Layout.wideMaxWidth, alignSelf: "center" as const, width: "100%" as const } : undefined;

  const { data: messages = [], isLoading: messagesLoading } = useQuery<ClawdMessage[]>({
    queryKey: ["/api/clawd/history"],
    enabled: activeTab === "chat",
    refetchInterval: 5000,
  });

  const { data: briefing, isLoading: briefingLoading, refetch: refetchBriefing } = useQuery<OrchestrationResponse>({
    queryKey: ["/api/clawd/briefing"],
    enabled: activeTab === "briefing",
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: runs = [], isLoading: runsLoading, refetch: refetchRuns } = useQuery<AssistantRun[]>({
    queryKey: ["/api/clawd/runs"],
    enabled: activeTab === "alerts",
  });

  const { data: discordAlertsList = [], isLoading: discordAlertsLoading, refetch: refetchDiscordAlerts } = useQuery<DiscordAlert[]>({
    queryKey: ["/api/discord-alerts"],
    enabled: activeTab === "alerts",
    refetchInterval: 15000,
  });

  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const handleContentSizeChange = useCallback(() => {
    if (messages.length > prevMessageCountRef.current) {
      scrollToBottom();
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  const sendMutation = useMutation({
    mutationFn: async ({ message, images }: { message: string; images?: string[] }) => {
      setIsSending(true);
      const body: Record<string, unknown> = { message };
      if (images && images.length > 0) {
        body.imageBase64 = images;
      }
      const res = await apiRequest("POST", "/api/clawd/chat", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clawd/history"] });
      setIsSending(false);
      scrollToBottom();
    },
    onError: () => {
      setIsSending(false);
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/clawd/history"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clawd/history"] });
    },
  });

  const ackMutation = useMutation({
    mutationFn: async ({ alertId, responseNote }: { alertId: string; responseNote?: string }) => {
      const res = await apiRequest("POST", `/api/discord-alerts/${alertId}/acknowledge`, { responseNote });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/discord-alerts"] });
    },
  });

  const handleSend = useCallback((text?: string) => {
    const msg = (text || inputText).trim();
    if (!msg && pendingImages.length === 0) return;
    if (isSending) return;
    const images = pendingImages.length > 0 ? [...pendingImages] : undefined;
    setInputText("");
    setPendingImages([]);
    sendMutation.mutate({ message: msg || "Analyze this image", images });
    scrollToBottom();
  }, [inputText, isSending, sendMutation, scrollToBottom, pendingImages]);

  const handlePickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
        quality: 0.7,
        allowsMultipleSelection: false,
      });
      if (!result.canceled && result.assets[0]?.base64) {
        setPendingImages(prev => [...prev, result.assets[0].base64!]);
      }
    } catch (err) {
      console.error("Image picker error:", err);
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Camera Permission", "Camera access is required to take photos.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        base64: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]?.base64) {
        setPendingImages(prev => [...prev, result.assets[0].base64!]);
      }
    } catch (err) {
      console.error("Camera error:", err);
    }
  }, []);

  const handleInsightTap = useCallback((query: string) => {
    setActiveTab("chat");
    sendMutation.mutate({ message: query });
  }, [sendMutation]);

  const handleAcknowledge = useCallback((alertId: string) => {
    Alert.alert(
      "Acknowledge Alert",
      "Mark this alert as acknowledged?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Acknowledge", onPress: () => ackMutation.mutate({ alertId }) },
      ]
    );
  }, [ackMutation]);

  const renderToolCallBadges = useCallback((toolCalls: ToolCall[]) => {
    const actionCalls = toolCalls.filter((tc) => ACTION_TOOL_NAMES.has(tc.toolName));
    if (actionCalls.length === 0) return null;

    const replitPromptCall = actionCalls.find((tc) => tc.toolName === "generate_replit_prompt");
    const promptResult = replitPromptCall?.result as { prompt?: string; isReplitAiPrompt?: boolean } | undefined;

    return (
      <View style={styles.toolBadgesContainer}>
        {actionCalls.map((tc, i) => {
          const icon = TOOL_ICONS[tc.toolName] || "zap";
          const isReplitPrompt = tc.toolName === "generate_replit_prompt";

          let label = tc.toolName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          if (tc.toolName === "send_sms") {
            const phone = tc.input.phoneNumber as string;
            label = `SMS → ${phone || "worker"}`;
          } else if (tc.toolName === "notify_gm_lilee") {
            label = "GM Lilee Notified";
          } else if (tc.toolName === "send_discord_notification") {
            const alertResult = tc.result as { alertId?: string } | undefined;
            label = `Discord ${alertResult?.alertId || ""}`;
          }

          return (
            <View key={i}>
              <Pressable
                style={[
                  styles.toolBadge,
                  {
                    backgroundColor: tc.success
                      ? isReplitPrompt ? theme.primary + "20" : "#22C55E20"
                      : "#EF444420",
                    borderColor: tc.success
                      ? isReplitPrompt ? theme.primary + "50" : "#22C55E50"
                      : "#EF444450",
                  },
                ]}
                onPress={isReplitPrompt && promptResult?.prompt ? () => setExpandedPrompt(expandedPrompt === `${i}` ? null : `${i}`) : undefined}
              >
                <Feather
                  name={tc.success ? icon : "alert-circle"}
                  size={11}
                  color={tc.success ? (isReplitPrompt ? theme.primary : "#22C55E") : "#EF4444"}
                />
                <ThemedText style={[styles.toolBadgeText, { color: tc.success ? (isReplitPrompt ? theme.primary : "#22C55E") : "#EF4444" }]}>
                  {label}
                </ThemedText>
                {isReplitPrompt && promptResult?.prompt ? (
                  <Feather name={expandedPrompt === `${i}` ? "chevron-up" : "chevron-down"} size={10} color={theme.primary} />
                ) : null}
              </Pressable>
              {isReplitPrompt && promptResult?.prompt && expandedPrompt === `${i}` ? (
                <View style={[styles.promptBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                  <ThemedText style={[styles.promptText, { color: theme.text }]} selectable>
                    {promptResult.prompt}
                  </ThemedText>
                  <Pressable
                    onPress={() => {
                      copyToClipboard(promptResult.prompt!);
                      Alert.alert("Copied!", "The Replit AI prompt has been copied to your clipboard.");
                    }}
                    style={[styles.copyBtn, { backgroundColor: theme.primary }]}
                  >
                    <Feather name="copy" size={12} color="#fff" />
                    <ThemedText style={styles.copyBtnText}>Copy Prompt</ThemedText>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    );
  }, [theme, expandedPrompt]);

  const renderMessage = useCallback(({ item }: { item: ClawdMessage }) => {
    const isUser = item.role === "user";
    const meta = isUser ? null : parseMetadata(item.metadata);
    const toolCalls = meta?.toolCalls || [];
    const isActionMode = meta?.isActionMode || false;

    return (
      <View style={[styles.msgRow, isUser ? styles.msgRight : styles.msgLeft]}>
        {!isUser ? (
          <View style={[styles.msgAvatar, { backgroundColor: isActionMode ? "#22C55E20" : theme.primary + "20" }]}>
            <Feather name={isActionMode ? "zap" : "zap"} size={14} color={isActionMode ? "#22C55E" : theme.primary} />
          </View>
        ) : null}
        <View style={styles.msgContent}>
          <View style={[styles.msgBubble, isUser ? { backgroundColor: theme.primary } : { backgroundColor: theme.surface }]}>
            {isActionMode && !isUser ? (
              <View style={styles.actionModeBadge}>
                <Feather name="zap" size={10} color="#22C55E" />
                <ThemedText style={styles.actionModeBadgeText}>Action Mode</ThemedText>
              </View>
            ) : null}
            {isUser ? (
              <ThemedText style={[styles.msgText, { color: "#fff" }]}>{item.content}</ThemedText>
            ) : (
              <SimpleMarkdown content={item.content} textColor={theme.text} />
            )}
            <ThemedText style={[styles.msgTime, { color: isUser ? "rgba(255,255,255,0.6)" : theme.textMuted }]}>
              {formatTimeAgo(item.createdAt)}
            </ThemedText>
          </View>
          {toolCalls.length > 0 ? renderToolCallBadges(toolCalls) : null}
        </View>
      </View>
    );
  }, [theme, renderToolCallBadges]);

  const ChatEmptyState = () => (
    <View style={styles.emptyChat}>
      <Feather name="zap" size={48} color={theme.primary} />
      <ThemedText style={[styles.emptyChatTitle, { color: theme.text }]}>Clawd AI Workspace</ThemedText>
      <ThemedText style={[styles.emptyChatSub, { color: theme.textSecondary }]}>
        Ask me anything, or tell me to take an action — assign workers, send SMS, check Discord alerts.
      </ThemedText>
    </View>
  );

  const renderTabSelector = () => (
    <View style={[styles.tabBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <View style={[styles.tabBarInner, wideStyle]}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tabBtn, activeTab === tab.key ? { borderBottomColor: theme.primary } : { borderBottomColor: "transparent" }]}
            testID={`tab-${tab.key}`}
          >
            <Feather name={tab.icon} size={16} color={activeTab === tab.key ? theme.primary : theme.textMuted} />
            <ThemedText style={[styles.tabLabel, { color: activeTab === tab.key ? theme.primary : theme.textMuted }]}>
              {tab.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const renderChat = () => (
    <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={0}>
      <FlatList
        ref={flatListRef}
        data={messages.toReversed()}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        inverted={messages.length > 0}
        ListEmptyComponent={messagesLoading ? <ActivityIndicator color={theme.primary} style={styles.loader} /> : <ChatEmptyState />}
        contentContainerStyle={[styles.chatList, { paddingBottom: topPadding, paddingTop: Spacing.md }, messages.length > 0 ? undefined : { flexGrow: 1 }]}
        scrollIndicatorInsets={{ top: isWeb ? 0 : headerHeight }}
        onContentSizeChange={handleContentSizeChange}
        testID="clawd-messages-list"
      />
      {isSending ? (
        <View style={[styles.thinkingBar, { backgroundColor: theme.primary + "15" }]}>
          <ActivityIndicator size="small" color={theme.primary} />
          <ThemedText style={[styles.thinkingText, { color: theme.primary }]}>Clawd is thinking...</ThemedText>
        </View>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContainer}>
        {QUICK_PROMPTS.map((prompt, i) => (
          <Pressable
            key={i}
            onPress={() => handleSend(prompt)}
            style={[styles.chip, { backgroundColor: theme.primary + "12", borderColor: theme.primary + "30" }]}
            testID={`chip-prompt-${i}`}
          >
            <ThemedText style={[styles.chipText, { color: theme.primary }]}>{prompt}</ThemedText>
          </Pressable>
        ))}
      </ScrollView>
      {pendingImages.length > 0 ? (
        <View style={[styles.pendingImagesRow, { borderTopColor: theme.border }]}>
          {pendingImages.map((b64, idx) => (
            <View key={idx} style={styles.pendingImageWrap}>
              <Image source={{ uri: `data:image/jpeg;base64,${b64}` }} style={styles.pendingImageThumb} />
              <Pressable
                onPress={() => setPendingImages(prev => prev.filter((_, i) => i !== idx))}
                style={[styles.pendingImageRemove, { backgroundColor: theme.error || "#EF4444" }]}
                testID={`remove-image-${idx}`}
              >
                <Feather name="x" size={10} color="#fff" />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      <View style={[styles.inputBar, { backgroundColor: theme.surface, borderTopColor: theme.border, paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.md }]}>
        <Pressable
          onPress={handlePickImage}
          style={[styles.imageBtn, { backgroundColor: theme.backgroundSecondary }]}
          testID="clawd-image-button"
        >
          <Feather name="image" size={18} color={theme.textMuted} />
        </Pressable>
        {Platform.OS !== "web" ? (
          <Pressable
            onPress={handleTakePhoto}
            style={[styles.imageBtn, { backgroundColor: theme.backgroundSecondary }]}
            testID="clawd-camera-button"
          >
            <Feather name="camera" size={18} color={theme.textMuted} />
          </Pressable>
        ) : null}
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
          placeholder={pendingImages.length > 0 ? "Add a message about the image..." : "Ask Clawd or give it an action to take..."}
          placeholderTextColor={theme.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={2000}
          testID="clawd-input"
          onKeyPress={Platform.OS === "web" ? (e: { nativeEvent: { key: string; shiftKey?: boolean }; preventDefault: () => void }) => {
            if (e.nativeEvent.key === "Enter" && !e.nativeEvent.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          } : undefined}
        />
        <Pressable
          onPress={() => handleSend()}
          disabled={!inputText.trim() && pendingImages.length === 0 || isSending}
          style={[styles.sendBtn, { backgroundColor: (inputText.trim() || pendingImages.length > 0) ? theme.primary : theme.backgroundSecondary }]}
          testID="clawd-send-button"
        >
          <Feather name="send" size={18} color={(inputText.trim() || pendingImages.length > 0) ? "#fff" : theme.textMuted} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );

  const renderBriefing = () => (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.lg }, wideStyle]}
      refreshControl={<RefreshControl refreshing={briefingLoading} onRefresh={() => refetchBriefing()} tintColor={theme.primary} />}
    >
      {briefingLoading ? (
        <ActivityIndicator color={theme.primary} style={styles.loader} />
      ) : briefing ? (
        <>
          <Card style={styles.briefingCard}>
            <View style={styles.briefingHeader}>
              <Feather name="zap" size={20} color={theme.primary} />
              <ThemedText style={styles.briefingTitle}>Daily Briefing</ThemedText>
              <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(briefing.overallSeverity) + "20" }]}>
                <View style={[styles.severityDot, { backgroundColor: getSeverityColor(briefing.overallSeverity) }]} />
                <ThemedText style={[styles.severityText, { color: getSeverityColor(briefing.overallSeverity) }]}>
                  {briefing.overallSeverity > 0.7 ? "High" : briefing.overallSeverity > 0.4 ? "Medium" : "Low"}
                </ThemedText>
              </View>
            </View>
            <SimpleMarkdown content={briefing.response} textColor={theme.text} />
          </Card>
          {briefing.assistantsInvoked.length > 0 ? (
            <Card style={styles.assistantsCard}>
              <ThemedText style={styles.assistantsTitle}>Assistants Consulted</ThemedText>
              <View style={styles.assistantsList}>
                {briefing.assistantsInvoked.map((a, i) => (
                  <View key={i} style={[styles.assistantChip, { backgroundColor: theme.primary + "12" }]}>
                    <ThemedText style={[styles.assistantChipText, { color: theme.primary }]}>
                      {a.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </ThemedText>
                  </View>
                ))}
              </View>
              <ThemedText style={[styles.metaText, { color: theme.textMuted }]}>
                Completed in {Math.round((briefing.metadata?.totalDurationMs || 0) / 1000)}s
              </ThemedText>
            </Card>
          ) : null}
        </>
      ) : (
        <Card style={styles.emptyCard}>
          <Feather name="file-text" size={32} color={theme.textSecondary} />
          <ThemedText style={styles.emptyTitle}>No Briefing Available</ThemedText>
          <ThemedText style={[styles.emptySub, { color: theme.textSecondary }]}>Pull down to generate a briefing.</ThemedText>
        </Card>
      )}
    </ScrollView>
  );

  const filteredRuns = alertFilter === "all" ? runs : runs.filter((r) => r.assistantType === alertFilter);
  const pendingDiscordCount = discordAlertsList.filter((a) => a.status === "pending").length;

  const renderAlerts = () => (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.lg }, wideStyle]}
      refreshControl={<RefreshControl refreshing={runsLoading || discordAlertsLoading} onRefresh={() => { refetchRuns(); refetchDiscordAlerts(); }} tintColor={theme.primary} />}
    >
      {/* Sub-tab selector */}
      <View style={[styles.subTabBar, { borderColor: theme.border }]}>
        <Pressable
          onPress={() => setAlertsTab("discord")}
          style={[styles.subTabBtn, alertsTab === "discord" ? { backgroundColor: theme.primary } : { backgroundColor: theme.backgroundSecondary }]}
        >
          <Feather name="bell" size={13} color={alertsTab === "discord" ? "#fff" : theme.textSecondary} />
          <ThemedText style={[styles.subTabText, { color: alertsTab === "discord" ? "#fff" : theme.textSecondary }]}>
            Discord {pendingDiscordCount > 0 ? `(${pendingDiscordCount})` : ""}
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setAlertsTab("runs")}
          style={[styles.subTabBtn, alertsTab === "runs" ? { backgroundColor: theme.primary } : { backgroundColor: theme.backgroundSecondary }]}
        >
          <Feather name="cpu" size={13} color={alertsTab === "runs" ? "#fff" : theme.textSecondary} />
          <ThemedText style={[styles.subTabText, { color: alertsTab === "runs" ? "#fff" : theme.textSecondary }]}>AI Runs</ThemedText>
        </Pressable>
      </View>

      {alertsTab === "discord" ? (
        <>
          {discordAlertsLoading ? (
            <ActivityIndicator color={theme.primary} style={styles.loader} />
          ) : discordAlertsList.length > 0 ? (
            discordAlertsList.map((alert) => {
              const typeColor = getAlertTypeColor(alert.type);
              const statusColor = getStatusColor(alert.status);
              const isPending = alert.status === "pending";

              return (
                <Card key={alert.id} style={{ ...styles.alertCard, borderLeftWidth: 3, borderLeftColor: typeColor }}>
                  <View style={styles.alertHeader}>
                    <View style={styles.alertTypeRow}>
                      <View style={[styles.alertTypeDot, { backgroundColor: typeColor }]} />
                      <ThemedText style={[styles.alertType, { color: typeColor }]}>
                        {alert.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </ThemedText>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
                      <ThemedText style={[styles.statusText, { color: statusColor }]}>
                        {alert.status.charAt(0).toUpperCase() + alert.status.slice(1)}
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText style={[styles.alertTitle, { color: theme.text }]}>{alert.title}</ThemedText>
                  <ThemedText style={[styles.alertFindings, { color: theme.textSecondary }]} numberOfLines={2}>
                    {alert.message}
                  </ThemedText>
                  {alert.actionsTaken ? (
                    <ThemedText style={[styles.actionsText, { color: theme.textMuted }]} numberOfLines={1}>
                      Actions: {alert.actionsTaken.slice(0, 80)}
                    </ThemedText>
                  ) : null}
                  {alert.acknowledgedBy ? (
                    <ThemedText style={[styles.ackText, { color: "#22C55E" }]}>
                      Acknowledged by {alert.acknowledgedBy}
                    </ThemedText>
                  ) : null}
                  <View style={styles.alertFooter}>
                    <View>
                      <ThemedText style={[styles.alertTime, { color: theme.textMuted }]}>{formatTimeAgo(alert.createdAt)}</ThemedText>
                      <ThemedText style={[styles.alertIdText, { color: theme.textMuted }]}>{alert.alertId}</ThemedText>
                    </View>
                    {isPending ? (
                      <Pressable
                        onPress={() => handleAcknowledge(alert.alertId)}
                        style={[styles.ackBtn, { backgroundColor: "#22C55E" }]}
                        disabled={ackMutation.isPending}
                      >
                        <Feather name="check" size={12} color="#fff" />
                        <ThemedText style={styles.ackBtnText}>Acknowledge</ThemedText>
                      </Pressable>
                    ) : null}
                  </View>
                </Card>
              );
            })
          ) : (
            <Card style={styles.emptyCard}>
              <Feather name="bell-off" size={32} color={theme.textSecondary} />
              <ThemedText style={styles.emptyTitle}>No Discord Alerts</ThemedText>
              <ThemedText style={[styles.emptySub, { color: theme.textSecondary }]}>
                Alerts for sick calls, client requests, and critical events will appear here.
              </ThemedText>
            </Card>
          )}
        </>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContainer}>
            {ASSISTANT_TYPES.map((type) => (
              <Pressable
                key={type}
                onPress={() => setAlertFilter(type)}
                style={[styles.filterChip, alertFilter === type ? { backgroundColor: theme.primary } : { backgroundColor: theme.backgroundSecondary }]}
                testID={`filter-${type}`}
              >
                <ThemedText style={[styles.filterChipText, { color: alertFilter === type ? "#fff" : theme.textSecondary }]}>
                  {type === "all" ? "All" : type.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
          {runsLoading ? (
            <ActivityIndicator color={theme.primary} style={styles.loader} />
          ) : filteredRuns.length > 0 ? (
            filteredRuns.map((run) => {
              const findings = run.outputFindings;
              let severity = 0;
              try {
                if (findings) {
                  const parsed = JSON.parse(findings);
                  severity = parsed.severityScore || parsed.severity_score || parsed.severity || 0;
                }
              } catch {}
              const sevColor = getSeverityColor(severity);
              return (
                <Card key={run.id} style={styles.alertCard}>
                  <View style={styles.alertHeader}>
                    <View style={styles.alertTypeRow}>
                      <Feather name="cpu" size={14} color={theme.primary} />
                      <ThemedText style={styles.alertType}>
                        {run.assistantType.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </ThemedText>
                    </View>
                    <View style={[styles.severityBadge, { backgroundColor: sevColor + "20" }]}>
                      <View style={[styles.severityDot, { backgroundColor: sevColor }]} />
                    </View>
                  </View>
                  <ThemedText style={styles.alertFindings} numberOfLines={3}>
                    {findings || "No findings recorded"}
                  </ThemedText>
                  <View style={styles.alertFooter}>
                    <ThemedText style={[styles.alertTime, { color: theme.textMuted }]}>{formatTimeAgo(run.createdAt)}</ThemedText>
                    {run.durationMs ? (
                      <ThemedText style={[styles.alertDuration, { color: theme.textMuted }]}>{Math.round(run.durationMs / 1000)}s</ThemedText>
                    ) : null}
                  </View>
                </Card>
              );
            })
          ) : (
            <Card style={styles.emptyCard}>
              <Feather name="bell-off" size={32} color={theme.textSecondary} />
              <ThemedText style={styles.emptyTitle}>No Alerts</ThemedText>
              <ThemedText style={[styles.emptySub, { color: theme.textSecondary }]}>No recent assistant runs found.</ThemedText>
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );

  const renderInsights = () => (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.lg }, wideStyle]}
    >
      <ThemedText style={styles.insightsTitle}>Intelligence Modules</ThemedText>
      <ThemedText style={[styles.insightsSub, { color: theme.textSecondary }]}>
        Tap a module to get a targeted analysis from Clawd.
      </ThemedText>
      {INSIGHT_CARDS.map((card) => {
        const lastRun = runs.find((r) => r.assistantType === card.type);
        return (
          <Card
            key={card.type}
            style={styles.insightCard}
            onPress={() => handleInsightTap(card.query)}
          >
            <View style={styles.insightRow}>
              <View style={[styles.insightIcon, { backgroundColor: theme.primary + "15" }]}>
                <Feather name={card.icon} size={22} color={theme.primary} />
              </View>
              <View style={styles.insightInfo}>
                <ThemedText style={styles.insightLabel}>{card.label}</ThemedText>
                <ThemedText style={[styles.insightMeta, { color: theme.textMuted }]}>
                  {lastRun ? `Last run: ${formatTimeAgo(lastRun.createdAt)}` : "Not yet analyzed"}
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={18} color={theme.textMuted} />
            </View>
          </Card>
        );
      })}
    </ScrollView>
  );

  const COLOR_META: Record<string, { label: string; hex: string }> = {
    blue: { label: "Info", hex: "#3B82F6" },
    green: { label: "Positive", hex: "#22C55E" },
    amber: { label: "Heads-up", hex: "#F59E0B" },
    red: { label: "Urgent", hex: "#EF4444" },
    purple: { label: "Milestone", hex: "#8B5CF6" },
  };

  const handlePreviewAnnouncement = useCallback(async () => {
    if (!announceDraft.trim()) return;
    setAnnouncePreviewing(true);
    setAnnouncePreview(null);
    setAnnounceSent(false);
    try {
      const res = await apiRequest("POST", "/api/discord/preview-announcement", { rawText: announceDraft.trim() });
      const data = await res.json();
      setAnnouncePreview(data);
    } catch {
      Alert.alert("Error", "Failed to generate preview. Please try again.");
    } finally {
      setAnnouncePreviewing(false);
    }
  }, [announceDraft]);

  const handleSendAnnouncement = useCallback(async () => {
    if (!announcePreview) return;
    setAnnounceSending(true);
    try {
      const res = await apiRequest("POST", "/api/discord/send-announcement", {
        title: announcePreview.title,
        body: announcePreview.body,
        color: announcePreview.color,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Send failed");
      setAnnounceSent(true);
      setAnnounceDraft("");
      setAnnouncePreview(null);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send announcement.");
    } finally {
      setAnnounceSending(false);
    }
  }, [announcePreview]);

  const renderAnnounce = () => {
    const accentColor = announcePreview ? (COLOR_META[announcePreview.color]?.hex || theme.primary) : theme.primary;
    return (
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={{ padding: Spacing.md, marginBottom: Spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.md }}>
            <Feather name="send" size={18} color={theme.primary} />
            <ThemedText style={{ fontWeight: "700", fontSize: 16, color: theme.text }}>Discord Announcement</ThemedText>
          </View>
          <ThemedText style={{ fontSize: 13, color: theme.textMuted, marginBottom: Spacing.sm }}>
            Write a rough draft — Claude will polish it into a clean, professional announcement before you send.
          </ThemedText>
          <TextInput
            style={[
              {
                backgroundColor: theme.inputBackground,
                color: theme.text,
                borderRadius: BorderRadius.md,
                padding: Spacing.md,
                minHeight: 120,
                fontSize: 14,
                textAlignVertical: "top",
                borderWidth: 1,
                borderColor: theme.border,
                marginBottom: Spacing.md,
              },
            ]}
            placeholder="e.g. reminder shift this friday 6am hotel 701 bay st need 3 workers call if you can make it"
            placeholderTextColor={theme.textMuted}
            value={announceDraft}
            onChangeText={(t) => { setAnnounceDraft(t); setAnnouncePreview(null); setAnnounceSent(false); }}
            multiline
            maxLength={1000}
            testID="announce-draft-input"
          />
          <Pressable
            onPress={handlePreviewAnnouncement}
            disabled={!announceDraft.trim() || announcePreviewing}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: Spacing.sm,
              backgroundColor: announceDraft.trim() ? theme.primary : theme.backgroundSecondary,
              paddingVertical: Spacing.sm + 2,
              borderRadius: BorderRadius.md,
            }}
            testID="button-preview-announcement"
          >
            {announcePreviewing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="eye" size={16} color={announceDraft.trim() ? "#fff" : theme.textMuted} />
            )}
            <ThemedText style={{ color: announceDraft.trim() ? "#fff" : theme.textMuted, fontWeight: "600" }}>
              {announcePreviewing ? "Claude is polishing..." : "Preview with Claude"}
            </ThemedText>
          </Pressable>
        </Card>

        {announcePreview ? (
          <Card style={{ padding: Spacing.md, marginBottom: Spacing.md, borderLeftWidth: 4, borderLeftColor: accentColor }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginBottom: Spacing.sm }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: accentColor }} />
              <ThemedText style={{ fontSize: 12, color: theme.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {COLOR_META[announcePreview.color]?.label || "Info"} — Discord Preview
              </ThemedText>
            </View>
            <ThemedText style={{ fontWeight: "700", fontSize: 16, color: theme.text, marginBottom: Spacing.sm }}>
              {announcePreview.title}
            </ThemedText>
            <ThemedText style={{ fontSize: 14, color: theme.text, lineHeight: 21, marginBottom: Spacing.md }}>
              {announcePreview.body}
            </ThemedText>
            <View style={{ flexDirection: "row", gap: Spacing.sm }}>
              <Pressable
                onPress={() => { setAnnouncePreview(null); }}
                style={{
                  flex: 1,
                  alignItems: "center",
                  paddingVertical: Spacing.sm,
                  borderRadius: BorderRadius.md,
                  backgroundColor: theme.backgroundSecondary,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
                testID="button-revise-announcement"
              >
                <ThemedText style={{ color: theme.text, fontWeight: "600" }}>Revise</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSendAnnouncement}
                disabled={announceSending}
                style={{
                  flex: 2,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: Spacing.sm,
                  paddingVertical: Spacing.sm,
                  borderRadius: BorderRadius.md,
                  backgroundColor: accentColor,
                }}
                testID="button-send-announcement"
              >
                {announceSending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Feather name="send" size={16} color="#fff" />
                )}
                <ThemedText style={{ color: "#fff", fontWeight: "700" }}>
                  {announceSending ? "Sending..." : "Send to Discord"}
                </ThemedText>
              </Pressable>
            </View>
          </Card>
        ) : null}

        {announceSent ? (
          <Card style={{ padding: Spacing.lg, alignItems: "center", gap: Spacing.sm }}>
            <Feather name="check-circle" size={32} color="#22C55E" />
            <ThemedText style={{ fontWeight: "700", fontSize: 16, color: theme.text }}>Announcement Sent!</ThemedText>
            <ThemedText style={{ fontSize: 13, color: theme.textMuted, textAlign: "center" }}>
              Your announcement has been posted to Discord.
            </ThemedText>
            <Pressable
              onPress={() => setAnnounceSent(false)}
              style={{ paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, backgroundColor: theme.primary, borderRadius: BorderRadius.md, marginTop: Spacing.sm }}
              testID="button-new-announcement"
            >
              <ThemedText style={{ color: "#fff", fontWeight: "600" }}>New Announcement</ThemedText>
            </Pressable>
          </Card>
        ) : null}
      </ScrollView>
    );
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        activeTab === "chat" ? (
          <Pressable onPress={() => clearMutation.mutate()} testID="button-clear-chat">
            <Feather name="trash-2" size={20} color={theme.textSecondary} />
          </Pressable>
        ) : null,
    });
  }, [activeTab, navigation, theme, clearMutation]);

  return (
    <ThemedView style={styles.container}>
      <View style={{ paddingTop: topPadding }}>
        {renderTabSelector()}
      </View>
      {activeTab === "chat" ? renderChat() : null}
      {activeTab === "briefing" ? renderBriefing() : null}
      {activeTab === "alerts" ? renderAlerts() : null}
      {activeTab === "insights" ? renderInsights() : null}
      {activeTab === "announce" ? renderAnnounce() : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  tabBar: { borderBottomWidth: 1 },
  tabBarInner: { flexDirection: "row" },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: Spacing.sm, borderBottomWidth: 2 },
  tabLabel: { fontSize: 13, fontWeight: "600" },
  chatList: { paddingHorizontal: Spacing.md },
  msgRow: { marginVertical: Spacing.xs, maxWidth: "85%", flexDirection: "row", gap: 8 },
  msgLeft: { alignSelf: "flex-start" },
  msgRight: { alignSelf: "flex-end" },
  msgContent: { flexShrink: 1, gap: 4 },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 4, flexShrink: 0 },
  msgBubble: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg, flexShrink: 1 },
  msgText: { fontSize: 15, lineHeight: 20 },
  msgTime: { fontSize: 11, marginTop: 4, textAlign: "right" },
  actionModeBadge: { flexDirection: "row", alignItems: "center", gap: 3, marginBottom: 4 },
  actionModeBadgeText: { fontSize: 10, fontWeight: "600", color: "#22C55E" },
  toolBadgesContainer: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 },
  toolBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full, borderWidth: 1 },
  toolBadgeText: { fontSize: 10, fontWeight: "600" },
  promptBox: { padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, marginTop: 4, maxHeight: 200 },
  promptText: { fontSize: 12, lineHeight: 16, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.sm, marginTop: Spacing.sm, alignSelf: "flex-start" },
  copyBtnText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  thinkingBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  thinkingText: { fontSize: 13, fontWeight: "500" },
  chipsScroll: { maxHeight: 44 },
  chipsContainer: { paddingHorizontal: Spacing.md, gap: Spacing.sm, alignItems: "center" },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: "500" },
  inputBar: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, gap: Spacing.sm },
  input: { flex: 1, minHeight: 40, maxHeight: 120, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg, fontSize: 16 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  imageBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  pendingImagesRow: { flexDirection: "row", paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, gap: Spacing.sm, borderTopWidth: 1 },
  pendingImageWrap: { position: "relative" },
  pendingImageThumb: { width: 56, height: 56, borderRadius: BorderRadius.md },
  pendingImageRemove: { position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: 9, justifyContent: "center", alignItems: "center" },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  briefingCard: { padding: Spacing.md, marginBottom: Spacing.md },
  briefingHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: Spacing.sm },
  briefingTitle: { fontSize: 18, fontWeight: "700", flex: 1 },
  briefingBody: { fontSize: 14, lineHeight: 22 },
  severityBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  severityDot: { width: 8, height: 8, borderRadius: 4 },
  severityText: { fontSize: 11, fontWeight: "600" },
  assistantsCard: { padding: Spacing.md, marginBottom: Spacing.md },
  assistantsTitle: { fontSize: 14, fontWeight: "600", marginBottom: Spacing.sm },
  assistantsList: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm },
  assistantChip: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: BorderRadius.full },
  assistantChipText: { fontSize: 12, fontWeight: "500" },
  metaText: { fontSize: 11, marginTop: Spacing.sm },
  subTabBar: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.md, borderRadius: BorderRadius.md, padding: 3 },
  subTabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: Spacing.sm, borderRadius: BorderRadius.sm },
  subTabText: { fontSize: 12, fontWeight: "600" },
  filterScroll: { marginBottom: Spacing.sm, maxHeight: 40 },
  filterContainer: { gap: Spacing.sm, paddingHorizontal: 0 },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full },
  filterChipText: { fontSize: 12, fontWeight: "600" },
  alertCard: { padding: Spacing.md, marginBottom: Spacing.sm },
  alertHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  alertTypeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  alertTypeDot: { width: 8, height: 8, borderRadius: 4 },
  alertType: { fontSize: 13, fontWeight: "600" },
  alertTitle: { fontSize: 14, fontWeight: "700", marginBottom: 2 },
  alertFindings: { fontSize: 13, lineHeight: 18, marginBottom: Spacing.sm },
  actionsText: { fontSize: 11, lineHeight: 15, marginBottom: 4, fontStyle: "italic" },
  ackText: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  alertFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  alertTime: { fontSize: 11 },
  alertIdText: { fontSize: 10 },
  alertDuration: { fontSize: 11 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: BorderRadius.full },
  statusText: { fontSize: 11, fontWeight: "600" },
  ackBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.sm },
  ackBtnText: { fontSize: 11, fontWeight: "600", color: "#fff" },
  insightsTitle: { fontSize: 18, fontWeight: "700", marginBottom: 2 },
  insightsSub: { fontSize: 13, marginBottom: Spacing.md },
  insightCard: { padding: Spacing.md, marginBottom: Spacing.sm },
  insightRow: { flexDirection: "row", alignItems: "center", gap: Spacing.md },
  insightIcon: { width: 48, height: 48, borderRadius: BorderRadius.lg, alignItems: "center", justifyContent: "center" },
  insightInfo: { flex: 1 },
  insightLabel: { fontSize: 15, fontWeight: "600" },
  insightMeta: { fontSize: 12, marginTop: 2 },
  emptyChat: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: Spacing["5xl"], paddingHorizontal: Spacing.lg },
  emptyChatTitle: { fontSize: 20, fontWeight: "700", marginTop: Spacing.md },
  emptyChatSub: { fontSize: 14, textAlign: "center", marginTop: Spacing.sm },
  emptyCard: { padding: Spacing.xl, alignItems: "center", gap: Spacing.sm, marginTop: Spacing.lg },
  emptyTitle: { fontSize: 15, fontWeight: "600" },
  emptySub: { fontSize: 12, textAlign: "center" },
  loader: { marginTop: Spacing.xl },
});
