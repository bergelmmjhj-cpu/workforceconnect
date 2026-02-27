import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { TitoCard } from "@/components/TitoCard";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/LoadingSkeleton";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { TitoLog, TitoApprovalStatus } from "@/types";
import { apiRequest, queryClient } from "@/lib/query-client";

const filterOptions: { label: string; value: TitoApprovalStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Disputed", value: "disputed" },
  { label: "Canceled", value: "canceled" },
];

interface TitoLogsListProps {
  paddingTop: number;
  paddingBottom: number;
  bottomInset: number;
}

export function TitoLogsList({
  paddingTop,
  paddingBottom,
  bottomInset,
}: TitoLogsListProps) {
  const { theme } = useTheme();
  const { user } = useAuth();

  const [filter, setFilter] = useState<TitoApprovalStatus | "all">("all");
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  const isAdminOrHR = user?.role === "admin" || user?.role === "hr";

  const handleEmailTimesheet = useCallback(async () => {
    if (!emailAddress || !emailAddress.includes("@")) return;
    setEmailSending(true);
    setEmailResult(null);
    try {
      await apiRequest("POST", "/api/tito/email-timesheet", { to: emailAddress.trim() });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setEmailResult({ success: true, message: "Timesheet emailed to payroll" });
      setTimeout(() => {
        setEmailModalVisible(false);
        setEmailAddress("");
        setEmailResult(null);
      }, 2000);
    } catch (error: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      let msg = "Failed to send email";
      try {
        if (error?.data?.error) {
          msg = error.data.error;
        } else if (error?.message) {
          msg = error.message;
        }
      } catch {}
      setEmailResult({ success: false, message: msg });
    } finally {
      setEmailSending(false);
    }
  }, [emailAddress]);

  const { data: titoLogs = [], isLoading, isError, refetch, isRefetching } = useQuery<TitoLog[]>({
    queryKey: ["/api/tito/my-logs"],
    refetchInterval: 15000,
  });

  const approveMutation = useMutation({
    mutationFn: async (titoId: string) => {
      const res = await apiRequest("POST", `/api/tito/${titoId}/approve`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tito/my-logs"] });
    },
  });

  const disputeMutation = useMutation({
    mutationFn: async (titoId: string) => {
      const res = await apiRequest("POST", `/api/tito/${titoId}/dispute`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tito/my-logs"] });
    },
  });

  const handleApprove = useCallback(async (tito: TitoLog) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    approveMutation.mutate(tito.id);
  }, [approveMutation]);

  const handleDispute = useCallback(async (tito: TitoLog) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    disputeMutation.mutate(tito.id);
  }, [disputeMutation]);

  const filteredLogs =
    filter === "all"
      ? titoLogs
      : titoLogs.filter((t) => t.status === filter);

  const canApprove = user?.role === "hr" || user?.role === "client" || user?.role === "admin";

  const renderFilter = () => (
    <View style={styles.filterRow}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={filterOptions}
        keyExtractor={(item) => item.value}
        contentContainerStyle={styles.filterContent}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              setFilter(item.value);
              Haptics.selectionAsync();
            }}
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  filter === item.value
                    ? theme.primary
                    : theme.backgroundSecondary,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.filterText,
                {
                  color:
                    filter === item.value ? "#fff" : theme.textSecondary,
                },
              ]}
            >
              {item.label}
            </ThemedText>
          </Pressable>
        )}
      />
    </View>
  );

  const renderEmpty = () => (
    <EmptyState
      image={require("../../assets/images/empty-tito.png")}
      title="No time logs"
      description={
        user?.role === "worker"
          ? "Your time entries will appear here after you clock in"
          : "No time logs to review at this time"
      }
    />
  );

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: paddingTop,
            paddingHorizontal: Spacing.lg,
          },
        ]}
      >
        <ListSkeleton count={3} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: theme.backgroundRoot, paddingTop }]}>
        <Feather name="alert-circle" size={48} color={theme.error} />
        <ThemedText type="h3" style={{ marginTop: Spacing.lg, textAlign: "center" }}>
          Failed to load time logs
        </ThemedText>
        <ThemedText style={{ color: theme.textSecondary, textAlign: "center", marginTop: Spacing.sm }}>
          Check your connection and try again
        </ThemedText>
        <Pressable
          testID="button-retry-tito"
          onPress={() => refetch()}
          style={[styles.retryButton, { backgroundColor: theme.primary }]}
        >
          <Feather name="refresh-cw" size={16} color="#FFFFFF" />
          <ThemedText style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 14 }}>Retry</ThemedText>
        </Pressable>
      </View>
    );
  }

  const listData = [{ type: "filter" as const }, ...filteredLogs.map(item => ({ type: "item" as const, data: item }))];

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={listData}
        keyExtractor={(item, index) => item.type === "filter" ? "filter-header" : (item as any).data.id}
        stickyHeaderIndices={[0]}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: paddingTop,
            paddingBottom: paddingBottom,
          },
          filteredLogs.length === 0 ? styles.emptyContent : undefined,
        ]}
        scrollIndicatorInsets={{ bottom: bottomInset }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.primary}
          />
        }
        renderItem={({ item, index }) => {
          if (item.type === "filter") {
            return (
              <View style={[styles.stickyFilter, { backgroundColor: theme.backgroundRoot }]}>
                <View style={styles.filterHeaderRow}>
                  <View style={{ flex: 1 }}>{renderFilter()}</View>
                  {isAdminOrHR ? (
                    <Pressable
                      testID="button-email-timesheet"
                      onPress={() => {
                        setEmailModalVisible(true);
                        Haptics.selectionAsync();
                      }}
                      style={[styles.emailButton, { backgroundColor: theme.primary }]}
                    >
                      <Feather name="mail" size={14} color="#FFFFFF" />
                      <ThemedText style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "600" }}>
                        {"Email"}
                      </ThemedText>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          }
          const titoItem = (item as any).data as TitoLog;
          return (
            <View style={index > 1 ? styles.separator : undefined}>
              <TitoCard
                tito={titoItem}
                showActions={canApprove}
                onApprove={() => handleApprove(titoItem)}
                onDispute={() => handleDispute(titoItem)}
              />
            </View>
          );
        }}
        ListEmptyComponent={renderEmpty}
      />
      <Modal
        visible={emailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!emailSending) {
            setEmailModalVisible(false);
            setEmailResult(null);
          }
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            if (!emailSending) {
              setEmailModalVisible(false);
              setEmailResult(null);
            }
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalKeyboardView}
          >
            <Pressable
              style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}
              onPress={() => {}}
            >
              <ThemedText type="h3" style={{ marginBottom: Spacing.lg }}>
                {"Email Timesheet"}
              </ThemedText>
              <ThemedText style={{ color: theme.textSecondary, marginBottom: Spacing.lg, fontSize: 14 }}>
                {"Enter the email address to send the TITO timesheet CSV report."}
              </ThemedText>
              <TextInput
                testID="input-email-timesheet"
                style={[
                  styles.emailInput,
                  {
                    backgroundColor: theme.inputBackground,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="payroll@company.com"
                placeholderTextColor={theme.textMuted}
                value={emailAddress}
                onChangeText={setEmailAddress}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!emailSending}
              />
              {emailResult ? (
                <View
                  style={[
                    styles.emailResultBanner,
                    { backgroundColor: emailResult.success ? theme.success + "20" : theme.error + "20" },
                  ]}
                >
                  <Feather
                    name={emailResult.success ? "check-circle" : "alert-circle"}
                    size={16}
                    color={emailResult.success ? theme.success : theme.error}
                  />
                  <ThemedText
                    style={{
                      color: emailResult.success ? theme.success : theme.error,
                      fontSize: 14,
                      flex: 1,
                    }}
                  >
                    {emailResult.message}
                  </ThemedText>
                </View>
              ) : null}
              <View style={styles.modalActions}>
                <Pressable
                  testID="button-cancel-email"
                  onPress={() => {
                    setEmailModalVisible(false);
                    setEmailResult(null);
                  }}
                  style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary }]}
                  disabled={emailSending}
                >
                  <ThemedText style={{ color: theme.textSecondary, fontWeight: "600", fontSize: 14 }}>
                    {"Cancel"}
                  </ThemedText>
                </Pressable>
                <Pressable
                  testID="button-send-email"
                  onPress={handleEmailTimesheet}
                  style={[
                    styles.modalButton,
                    styles.modalButtonPrimary,
                    {
                      backgroundColor: theme.primary,
                      opacity: emailSending || !emailAddress.includes("@") ? 0.6 : 1,
                    },
                  ]}
                  disabled={emailSending || !emailAddress.includes("@")}
                >
                  {emailSending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Feather name="send" size={16} color="#FFFFFF" />
                  )}
                  <ThemedText style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 14 }}>
                    {emailSending ? "Sending..." : "Send"}
                  </ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  stickyFilter: {
    paddingBottom: Spacing.xs,
  },
  filterRow: {},
  filterContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  emptyContent: {
    flexGrow: 1,
  },
  separator: {
    paddingTop: Spacing.sm,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xl,
  },
  filterHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  emailButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalKeyboardView: {
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "85%",
    maxWidth: 400,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  emailInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    marginBottom: Spacing.lg,
  },
  emailResultBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  modalButtonPrimary: {},
});
