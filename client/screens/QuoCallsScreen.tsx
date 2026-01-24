import React, { useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useContentPadding } from "@/hooks/useContentPadding";
import { Spacing, BorderRadius } from "@/constants/theme";
import { QuoCallLog } from "@/types";
import { getApiUrl } from "@/lib/query-client";
import { formatRelativeTime } from "@/utils/format";

export default function QuoCallsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { paddingTop } = useContentPadding();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showNewCall, setShowNewCall] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");

  const { data: callLogs, isLoading, refetch } = useQuery<QuoCallLog[]>({
    queryKey: ["/api/quo/calls"],
    queryFn: async () => {
      const res = await fetch(`${getApiUrl()}api/quo/calls`, {
        headers: { "x-user-role": user?.role || "admin" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch call logs");
      return res.json();
    },
    enabled: !!user && (user.role === "admin" || user.role === "hr"),
  });

  const initiateCallMutation = useMutation({
    mutationFn: async (data: { toNumber: string; participantName?: string }) => {
      const res = await fetch(`${getApiUrl()}api/quo/calls`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user?.role || "admin",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to initiate call");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quo/calls"] });
      setShowNewCall(false);
      setNewPhone("");
      setNewName("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const handleInitiateCall = () => {
    if (newPhone.trim()) {
      initiateCallMutation.mutate({
        toNumber: newPhone.trim(),
        participantName: newName.trim() || undefined,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return theme.success;
      case "failed":
      case "no-answer":
        return theme.error;
      case "initiated":
      case "ringing":
      case "in-progress":
        return theme.warning;
      default:
        return theme.textSecondary;
    }
  };

  const getStatusIcon = (status: string): keyof typeof Feather.glyphMap => {
    switch (status) {
      case "completed":
        return "phone-call";
      case "failed":
      case "no-answer":
        return "phone-missed";
      case "initiated":
      case "ringing":
        return "phone-outgoing";
      case "in-progress":
        return "phone";
      default:
        return "phone";
    }
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const renderItem = ({ item }: { item: QuoCallLog }) => (
    <Card style={styles.callCard}>
      <View style={styles.callRow}>
        <View style={[styles.iconCircle, { backgroundColor: getStatusColor(item.status) + "20" }]}>
          <Feather
            name={getStatusIcon(item.status)}
            size={20}
            color={getStatusColor(item.status)}
          />
        </View>
        <View style={styles.callInfo}>
          <ThemedText type="h4" numberOfLines={1}>
            {item.participantName || (item.direction === "outbound" ? item.toNumber : item.fromNumber)}
          </ThemedText>
          <View style={styles.callMeta}>
            <Feather
              name={item.direction === "outbound" ? "arrow-up-right" : "arrow-down-left"}
              size={14}
              color={theme.textSecondary}
            />
            <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
              {item.direction === "outbound" ? "Outgoing" : "Incoming"}
            </ThemedText>
            {item.durationSeconds ? (
              <ThemedText style={[styles.metaText, { color: theme.textSecondary }]}>
                {" "}  {formatDuration(item.durationSeconds)}
              </ThemedText>
            ) : null}
          </View>
          <ThemedText style={[styles.time, { color: theme.textSecondary }]}>
            {formatRelativeTime(item.startedAt)}
          </ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + "20" }]}>
          <ThemedText style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status}
          </ThemedText>
        </View>
      </View>
    </Card>
  );

  const renderEmpty = () => (
    <EmptyState
      image={require("../../assets/images/empty-messages.png")}
      title="No call history"
      description="Your outbound and inbound calls will appear here"
    />
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop }]}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} style={styles.callCard}>
            <View style={[styles.callRow, { opacity: 0.5 }]}>
              <View style={[styles.iconCircle, { backgroundColor: theme.border }]} />
              <View style={styles.callInfo}>
                <View style={[styles.skeletonLine, { backgroundColor: theme.border }]} />
                <View style={[styles.skeletonLineShort, { backgroundColor: theme.border }]} />
              </View>
            </View>
          </Card>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={callLogs || []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop, paddingBottom: tabBarHeight + Spacing.xl },
          (callLogs?.length || 0) === 0 && styles.emptyContent,
        ]}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={theme.primary} />
        }
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      />

      {showNewCall ? (
        <View style={[styles.newCallCard, { bottom: tabBarHeight + Spacing.lg, backgroundColor: theme.surface, borderRadius: BorderRadius.lg }]}>
          <ThemedText type="h4" style={styles.newCallTitle}>New Call</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
            placeholder="Phone number"
            placeholderTextColor={theme.textSecondary}
            value={newPhone}
            onChangeText={setNewPhone}
            keyboardType="phone-pad"
            testID="input-call-phone"
          />
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
            placeholder="Name (optional)"
            placeholderTextColor={theme.textSecondary}
            value={newName}
            onChangeText={setNewName}
            testID="input-call-name"
          />
          <View style={styles.newCallActions}>
            <Pressable
              onPress={() => setShowNewCall(false)}
              style={[styles.actionButton, { backgroundColor: theme.border }]}
            >
              <ThemedText>Cancel</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleInitiateCall}
              style={[styles.actionButton, { backgroundColor: theme.success }]}
              disabled={initiateCallMutation.isPending}
            >
              <Feather name="phone" size={16} color="#fff" style={{ marginRight: 6 }} />
              <ThemedText style={{ color: "#fff" }}>
                {initiateCallMutation.isPending ? "Calling..." : "Call"}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {!showNewCall ? (
        <Pressable
          style={[styles.fab, { backgroundColor: theme.success, bottom: tabBarHeight + Spacing.lg }]}
          onPress={() => {
            Haptics.selectionAsync();
            setShowNewCall(true);
          }}
          testID="button-new-call"
        >
          <Feather name="phone" size={24} color="#fff" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  callCard: {
    padding: Spacing.md,
  },
  callRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  callInfo: {
    flex: 1,
    gap: 2,
  },
  callMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  time: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  skeletonLine: {
    height: 16,
    width: "70%",
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonLineShort: {
    height: 14,
    width: "40%",
    borderRadius: 4,
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  newCallCard: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    padding: Spacing.lg,
    elevation: 10,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  newCallTitle: {
    marginBottom: Spacing.md,
  },
  input: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    fontSize: 16,
  },
  newCallActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
});
