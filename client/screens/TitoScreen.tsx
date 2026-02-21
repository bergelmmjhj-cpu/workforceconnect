import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { TitoCard } from "@/components/TitoCard";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/LoadingSkeleton";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useContentPadding } from "@/hooks/useContentPadding";
import { Spacing, BorderRadius } from "@/constants/theme";
import { TitoLog, TitoApprovalStatus } from "@/types";
import { apiRequest, queryClient } from "@/lib/query-client";
import { Feather } from "@expo/vector-icons";

const filterOptions: { label: string; value: TitoApprovalStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Disputed", value: "disputed" },
];

export default function TitoScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { paddingTop, paddingBottom } = useContentPadding();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [filter, setFilter] = useState<TitoApprovalStatus | "all">("all");

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
    <View style={styles.filterContainer}>
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

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.filterContainer, { top: paddingTop }]}>
        {renderFilter()}
      </View>
      <FlatList
        data={filteredLogs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: paddingTop + Spacing["3xl"] + Spacing.md,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
          filteredLogs.length === 0 ? styles.emptyContent : undefined,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.primary}
          />
        }
        renderItem={({ item }) => (
          <TitoCard
            tito={item}
            showActions={canApprove}
            onApprove={() => handleApprove(item)}
            onDispute={() => handleDispute(item)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={renderEmpty}
      />
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
  filterContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
  },
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
    height: Spacing.md,
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
});
