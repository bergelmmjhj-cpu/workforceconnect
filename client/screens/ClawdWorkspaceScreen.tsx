import React, { useState, useRef, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Layout, BorderRadius } from "@/constants/theme";
import { useIsWideWeb } from "@/components/WebSidebarLayout";
import { apiRequest } from "@/lib/query-client";

type ClawdMessage = {
  id: string;
  userId: string;
  role: string;
  content: string;
  metadata: string | null;
  createdAt: string;
};

type OrchestrationResponse = {
  response: string;
  assistantsInvoked: string[];
  overallSeverity: number;
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

type TabKey = "chat" | "briefing" | "alerts" | "insights";

const TABS: { key: TabKey; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
  { key: "chat", label: "Chat", icon: "message-circle" },
  { key: "briefing", label: "Briefing", icon: "file-text" },
  { key: "alerts", label: "Alerts", icon: "bell" },
  { key: "insights", label: "Insights", icon: "bar-chart-2" },
];

const QUICK_PROMPTS = [
  "What should I worry about today?",
  "Executive summary",
  "Worker reliability risks",
  "Unfilled shifts",
  "Pipeline status",
];

const ASSISTANT_TYPES = ["all", "staffing", "attendance", "recruitment", "payroll", "client_risk"];

const INSIGHT_CARDS = [
  { type: "staffing", label: "Staffing", icon: "users" as const, query: "Staffing Intelligence: Give me current staffing analysis" },
  { type: "attendance", label: "Attendance", icon: "clock" as const, query: "Attendance Intelligence: Give me current attendance analysis" },
  { type: "recruitment", label: "Recruitment", icon: "user-plus" as const, query: "Recruitment Intelligence: Give me current recruitment analysis" },
  { type: "payroll", label: "Payroll", icon: "dollar-sign" as const, query: "Payroll Intelligence: Give me current payroll analysis" },
  { type: "client_risk", label: "Client Risk", icon: "alert-triangle" as const, query: "Client Risk Intelligence: Give me current client risk analysis" },
];

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
  const [alertFilter, setAlertFilter] = useState("all");
  const flatListRef = useRef<FlatList>(null);

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

  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      setIsSending(true);
      const res = await apiRequest("POST", "/api/clawd/chat", { message });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clawd/history"] });
      setIsSending(false);
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

  const handleSend = useCallback((text?: string) => {
    const msg = (text || inputText).trim();
    if (!msg || isSending) return;
    setInputText("");
    sendMutation.mutate(msg);
  }, [inputText, isSending, sendMutation]);

  const handleInsightTap = useCallback((query: string) => {
    setActiveTab("chat");
    sendMutation.mutate(query);
  }, [sendMutation]);

  const renderMessage = useCallback(({ item }: { item: ClawdMessage }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRight : styles.msgLeft]}>
        {!isUser ? (
          <View style={[styles.msgAvatar, { backgroundColor: theme.primary + "20" }]}>
            <Feather name="zap" size={14} color={theme.primary} />
          </View>
        ) : null}
        <View style={[styles.msgBubble, isUser ? { backgroundColor: theme.primary } : { backgroundColor: theme.surface }]}>
          <ThemedText style={[styles.msgText, { color: isUser ? "#fff" : theme.text }]}>
            {item.content}
          </ThemedText>
          <ThemedText style={[styles.msgTime, { color: isUser ? "rgba(255,255,255,0.6)" : theme.textMuted }]}>
            {formatTimeAgo(item.createdAt)}
          </ThemedText>
        </View>
      </View>
    );
  }, [theme]);

  const ChatEmptyState = () => (
    <View style={styles.emptyChat}>
      <Feather name="zap" size={48} color={theme.primary} />
      <ThemedText style={[styles.emptyChatTitle, { color: theme.text }]}>Clawd AI Workspace</ThemedText>
      <ThemedText style={[styles.emptyChatSub, { color: theme.textSecondary }]}>
        Ask me anything about your workforce operations.
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
        contentContainerStyle={[styles.chatList, { paddingTop: Spacing.md }, messages.length > 0 ? undefined : { flexGrow: 1 }]}
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
      <View style={[styles.inputBar, { backgroundColor: theme.surface, borderTopColor: theme.border, paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.md }]}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
          placeholder="Ask Clawd..."
          placeholderTextColor={theme.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={2000}
          testID="clawd-input"
        />
        <Pressable
          onPress={() => handleSend()}
          disabled={!inputText.trim() || isSending}
          style={[styles.sendBtn, { backgroundColor: inputText.trim() ? theme.primary : theme.backgroundSecondary }]}
          testID="clawd-send-button"
        >
          <Feather name="send" size={18} color={inputText.trim() ? "#fff" : theme.textMuted} />
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
            <ThemedText style={styles.briefingBody}>{briefing.response}</ThemedText>
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

  const renderAlerts = () => (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.lg }, wideStyle]}
      refreshControl={<RefreshControl refreshing={runsLoading} onRefresh={() => refetchRuns()} tintColor={theme.primary} />}
    >
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
  chatList: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  msgRow: { marginVertical: Spacing.xs, maxWidth: "80%", flexDirection: "row", gap: 8 },
  msgLeft: { alignSelf: "flex-start" },
  msgRight: { alignSelf: "flex-end" },
  msgAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginTop: 4 },
  msgBubble: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg, flexShrink: 1 },
  msgText: { fontSize: 15, lineHeight: 20 },
  msgTime: { fontSize: 11, marginTop: 4, textAlign: "right" },
  thinkingBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  thinkingText: { fontSize: 13, fontWeight: "500" },
  chipsScroll: { maxHeight: 44 },
  chipsContainer: { paddingHorizontal: Spacing.md, gap: Spacing.sm, alignItems: "center" },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: "500" },
  inputBar: { flexDirection: "row", alignItems: "flex-end", paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, borderTopWidth: 1, gap: Spacing.sm },
  input: { flex: 1, minHeight: 40, maxHeight: 120, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.lg, fontSize: 16 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
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
  filterScroll: { marginBottom: Spacing.sm, maxHeight: 40 },
  filterContainer: { gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: BorderRadius.full },
  filterChipText: { fontSize: 12, fontWeight: "600" },
  alertCard: { padding: Spacing.md, marginBottom: Spacing.sm },
  alertHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  alertTypeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  alertType: { fontSize: 13, fontWeight: "600" },
  alertFindings: { fontSize: 13, lineHeight: 18, marginBottom: Spacing.sm },
  alertFooter: { flexDirection: "row", justifyContent: "space-between" },
  alertTime: { fontSize: 11 },
  alertDuration: { fontSize: 11 },
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
