import React, { useEffect, useState, useCallback } from "react";
import { View, StyleSheet, RefreshControl, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { TodoWidget } from "@/components/TodoWidget";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { StatCardSkeleton } from "@/components/LoadingSkeleton";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useContentPadding } from "@/hooks/useContentPadding";
import { Spacing } from "@/constants/theme";
import { getGreeting } from "@/utils/format";
import { TodoItem, DashboardStats, APIShift } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Card } from "@/components/Card";
import {
  getRequests,
  getTitoLogs,
  initializeStorage,
} from "@/storage";

type DashboardNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { paddingTop, paddingBottom } = useContentPadding();
  const navigation = useNavigation<DashboardNavigationProp>();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    activeRequests: 0,
    pendingApprovals: 0,
    hoursThisWeek: 0,
    upcomingShifts: 0,
  });

  const { data: apiShifts = [], refetch: refetchShifts } = useQuery<APIShift[]>({
    queryKey: ["/api/shifts"],
  });

  const loadData = useCallback(async () => {
    try {
      await initializeStorage();
      
      const [requests, titoLogs] = await Promise.all([
        getRequests(user?.id, user?.role),
        getTitoLogs(user?.id, user?.role),
      ]);

      const todoItems: TodoItem[] = [];

      if (user?.role === "hr" || user?.role === "admin") {
        const now = new Date();
        requests.forEach((req) => {
          const slaDate = new Date(req.slaDeadline);
          const hoursLeft = (slaDate.getTime() - now.getTime()) / (1000 * 60 * 60);
          
          if (hoursLeft <= 0 && req.status !== "completed" && req.status !== "cancelled") {
            todoItems.push({
              id: `sla-${req.id}`,
              title: "SLA Breach",
              description: `${req.roleNeeded} request overdue`,
              type: "sla_breach",
              actionUrl: `/requests/${req.id}`,
            });
          } else if (hoursLeft <= 4 && hoursLeft > 0 && req.status !== "completed") {
            todoItems.push({
              id: `urgent-${req.id}`,
              title: "Urgent Review",
              description: `${req.roleNeeded} - ${Math.round(hoursLeft)}h left`,
              type: "urgent",
              actionUrl: `/requests/${req.id}`,
            });
          }
        });

        const pendingTito = titoLogs.filter((t) => t.status === "pending");
        pendingTito.forEach((tito) => {
          todoItems.push({
            id: `tito-${tito.id}`,
            title: "TITO Pending",
            description: `${tito.workerName} awaiting approval`,
            type: "normal",
            actionUrl: `/tito/${tito.id}`,
          });
        });
      }

      if (user?.role === "worker") {
        const upcomingShifts = apiShifts.filter(
          (s) => s.status === "scheduled" || s.status === "in_progress"
        );
        upcomingShifts.slice(0, 2).forEach((shift) => {
          todoItems.push({
            id: `shift-${shift.id}`,
            title: "Upcoming Shift",
            description: `${shift.title} at ${shift.workplaceName || "workplace"}`,
            type: "normal",
            actionUrl: `/shifts/${shift.id}`,
          });
        });
      }

      if (user?.role === "client") {
        const pendingApprovals = titoLogs.filter((t) => t.status === "pending");
        pendingApprovals.forEach((tito) => {
          todoItems.push({
            id: `approve-${tito.id}`,
            title: "Approve Time",
            description: `${tito.workerName} submitted hours`,
            type: "normal",
            actionUrl: `/tito/${tito.id}`,
          });
        });

        const draftRequests = requests.filter((r) => r.status === "draft");
        draftRequests.forEach((req) => {
          todoItems.push({
            id: `draft-${req.id}`,
            title: "Complete Request",
            description: `${req.roleNeeded} request in draft`,
            type: "normal",
            actionUrl: `/requests/${req.id}`,
          });
        });
      }

      setTodos(todoItems.slice(0, 5));

      const activeReqs = requests.filter(
        (r) => !["completed", "cancelled"].includes(r.status)
      ).length;
      const pendingApprovals = titoLogs.filter((t) => t.status === "pending").length;
      const completedShifts = apiShifts.filter((s) => s.status === "completed");
      const hoursWorked = completedShifts.length * 8;
      const upcoming = apiShifts.filter((s) => s.status === "scheduled").length;

      setStats({
        activeRequests: activeReqs,
        pendingApprovals,
        hoursThisWeek: hoursWorked,
        upcomingShifts: upcoming,
      });
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, apiShifts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    refetchShifts();
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const getStatsForRole = () => {
    switch (user?.role) {
      case "client":
        return [
          { title: "Active Requests", value: stats.activeRequests, icon: "file-text" as const, color: theme.primary },
          { title: "Pending Approvals", value: stats.pendingApprovals, icon: "clock" as const, color: theme.warning },
          { title: "Upcoming Shifts", value: stats.upcomingShifts, icon: "calendar" as const, color: theme.success },
        ];
      case "worker":
        return [
          { title: "Upcoming Shifts", value: stats.upcomingShifts, icon: "calendar" as const, color: theme.primary },
          { title: "Hours This Week", value: stats.hoursThisWeek, icon: "clock" as const, color: theme.success },
          { title: "Pending TITO", value: stats.pendingApprovals, icon: "check-circle" as const, color: theme.warning },
        ];
      case "hr":
        return [
          { title: "Open Requests", value: stats.activeRequests, icon: "inbox" as const, color: theme.primary },
          { title: "Pending Reviews", value: stats.pendingApprovals, icon: "clock" as const, color: theme.warning },
          { title: "Shifts Today", value: stats.upcomingShifts, icon: "calendar" as const, color: theme.success },
        ];
      case "admin":
        return [
          { title: "Total Requests", value: stats.activeRequests, icon: "file-text" as const, color: theme.primary },
          { title: "System Users", value: 4, icon: "users" as const, color: theme.success },
          { title: "Pending Actions", value: stats.pendingApprovals, icon: "alert-circle" as const, color: theme.warning },
        ];
      default:
        return [];
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop,
          paddingBottom,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.primary}
        />
      }
    >
      <View style={styles.greeting}>
        <ThemedText type="h1">
          {getGreeting()}, {user?.fullName?.split(" ")[0]}
        </ThemedText>
        <ThemedText style={[styles.roleLabel, { color: theme.textSecondary }]}>
          {user?.role?.charAt(0).toUpperCase() + (user?.role?.slice(1) || "")}
        </ThemedText>
      </View>

      <View style={styles.statsGrid}>
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          getStatsForRole().map((stat, index) => (
            <StatCard
              key={index}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
            />
          ))
        )}
      </View>

      {user?.role === "admin" && (
        <View style={styles.quickActionsSection}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Quick Actions
          </ThemedText>
          <View style={styles.quickActionsGrid}>
            <Pressable
              style={[styles.quickActionCard, { backgroundColor: theme.backgroundSecondary }]}
              onPress={() => navigation.navigate("AdminManage")}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.primary + "20" }]}>
                <Feather name="settings" size={24} color={theme.primary} />
              </View>
              <ThemedText style={styles.quickActionTitle}>Management Hub</ThemedText>
              <ThemedText style={[styles.quickActionDesc, { color: theme.textSecondary }]}>
                Workplaces, Workers, Assignments
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.quickActionCard, { backgroundColor: theme.backgroundSecondary }]}
              onPress={() => navigation.navigate("WorkplacesList")}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: theme.success + "20" }]}>
                <Feather name="map-pin" size={24} color={theme.success} />
              </View>
              <ThemedText style={styles.quickActionTitle}>Workplaces</ThemedText>
              <ThemedText style={[styles.quickActionDesc, { color: theme.textSecondary }]}>
                Manage work sites
              </ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      <View style={styles.todoSection}>
        <TodoWidget items={todos} onItemPress={() => {}} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  greeting: {
    marginBottom: Spacing["2xl"],
  },
  roleLabel: {
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  statsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing["2xl"],
  },
  todoSection: {
    marginBottom: Spacing.lg,
  },
  quickActionsSection: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  quickActionsGrid: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  quickActionCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: 12,
    alignItems: "center",
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  quickActionDesc: {
    fontSize: 12,
    textAlign: "center",
  },
});
