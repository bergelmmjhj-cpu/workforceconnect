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
import { Spacing, BorderRadius } from "@/constants/theme";
import { getGreeting } from "@/utils/format";
import { TodoItem, DashboardStats, APIShift } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Card } from "@/components/Card";
import {
  getRequests,
  getTitoLogs,
  initializeStorage,
} from "@/storage";

interface MyTodayData {
  today: string;
  todayShifts: Array<{
    id: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string | null;
    status: string;
    category: string | null;
    workplaceId: string | null;
    workerUserId: string | null;
    workplaceName: string | null;
    workerName: string | null;
  }>;
  pendingOffers: Array<{
    id: string;
    shiftId: string;
    status: string;
    shiftTitle: string;
    shiftDate: string;
    shiftStartTime: string;
    shiftEndTime: string | null;
    workplaceName: string | null;
  }>;
  pendingRequestsCount: number;
  unfilledTodayCount: number;
  totalTodayShifts: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  hotel: "#6366f1",
  banquet: "#f59e0b",
  janitorial: "#10b981",
};

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

  const { data: myToday, refetch: refetchMyToday } = useQuery<MyTodayData>({
    queryKey: ["/api/my-today"],
    enabled: !!user,
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
    refetchMyToday();
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
        <ThemedText style={{ color: theme.primary, fontSize: 11, marginTop: 4, fontWeight: "600" }}>
          v1.1.0 - Updated Feb 2026
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

      {myToday ? (
        <View style={styles.myTodaySection}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            My Today
          </ThemedText>

          {(user?.role === "admin" || user?.role === "hr") && myToday.unfilledTodayCount > 0 ? (
            <Card style={{ ...styles.alertCard, borderLeftColor: "#f59e0b" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Feather name="alert-triangle" size={16} color="#f59e0b" />
                <ThemedText style={{ fontSize: 13, fontWeight: "600" }}>
                  {myToday.unfilledTodayCount} unfilled shift{myToday.unfilledTodayCount !== 1 ? "s" : ""} today
                </ThemedText>
              </View>
            </Card>
          ) : null}

          {user?.role === "worker" && myToday.pendingOffers.length > 0 ? (
            <View style={{ marginBottom: Spacing.md }}>
              <ThemedText style={[styles.subSectionLabel, { color: theme.warning }]}>
                PENDING OFFERS ({myToday.pendingOffers.length})
              </ThemedText>
              {myToday.pendingOffers.map((offer) => (
                <Card key={offer.id} style={styles.todayShiftCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={{ fontSize: 14, fontWeight: "600" }}>{offer.shiftTitle}</ThemedText>
                      <ThemedText style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                        {offer.shiftDate} {offer.shiftStartTime}{offer.shiftEndTime ? ` - ${offer.shiftEndTime}` : ""}
                      </ThemedText>
                      {offer.workplaceName ? (
                        <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>{offer.workplaceName}</ThemedText>
                      ) : null}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: "#f59e0b20" }]}>
                      <ThemedText style={{ fontSize: 10, fontWeight: "600", color: "#f59e0b" }}>Pending</ThemedText>
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          ) : null}

          {myToday.todayShifts.length > 0 ? (
            <View>
              <ThemedText style={[styles.subSectionLabel, { color: theme.primary }]}>
                TODAY'S SHIFTS ({myToday.todayShifts.length})
              </ThemedText>
              {myToday.todayShifts.map((shift) => (
                <Pressable
                  key={shift.id}
                  onPress={() => {
                    if (user?.role === "worker" && shift.workerUserId === user?.id) {
                      navigation.navigate("ClockInOut", { shiftId: shift.id });
                    } else {
                      navigation.navigate("ShiftDetail", { shiftId: shift.id });
                    }
                  }}
                >
                  <Card style={styles.todayShiftCard}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{ fontSize: 14, fontWeight: "600" }}>{shift.title}</ThemedText>
                        <ThemedText style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                          {shift.startTime}{shift.endTime ? ` - ${shift.endTime}` : " (Open)"}
                        </ThemedText>
                        {shift.workplaceName ? (
                          <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>{shift.workplaceName}</ThemedText>
                        ) : null}
                        {shift.workerName ? (
                          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4, gap: 4 }}>
                            <Feather name="user" size={11} color={theme.textSecondary} />
                            <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>{shift.workerName}</ThemedText>
                          </View>
                        ) : null}
                      </View>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        {shift.category ? (
                          <View style={[styles.statusBadge, { backgroundColor: (CATEGORY_COLORS[shift.category] || "#6b7280") + "20" }]}>
                            <ThemedText style={{ fontSize: 10, fontWeight: "600", color: CATEGORY_COLORS[shift.category] || "#6b7280" }}>
                              {shift.category.charAt(0).toUpperCase() + shift.category.slice(1)}
                            </ThemedText>
                          </View>
                        ) : null}
                        <View style={[styles.statusBadge, {
                          backgroundColor: shift.status === "completed" ? "#10b98120" :
                            shift.status === "in_progress" ? "#3b82f620" :
                            shift.status === "cancelled" ? "#ef444420" : theme.primary + "15"
                        }]}>
                          <ThemedText style={{ fontSize: 10, fontWeight: "600", color:
                            shift.status === "completed" ? "#10b981" :
                            shift.status === "in_progress" ? "#3b82f6" :
                            shift.status === "cancelled" ? "#ef4444" : theme.primary
                          }}>
                            {shift.status.charAt(0).toUpperCase() + shift.status.slice(1).replace("_", " ")}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          ) : (
            <Card style={styles.emptyTodayCard}>
              <Feather name="sun" size={24} color={theme.textSecondary} />
              <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.xs, fontSize: 13 }}>
                {user?.role === "worker" ? "No shifts scheduled for today" : "No shifts today"}
              </ThemedText>
            </Card>
          )}
        </View>
      ) : null}

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
  myTodaySection: {
    marginBottom: Spacing["2xl"],
  },
  subSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  alertCard: {
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 3,
  },
  todayShiftCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  emptyTodayCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
});
