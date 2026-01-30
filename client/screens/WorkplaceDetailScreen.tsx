import React, { useCallback } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, Platform, RefreshControl } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, NavigationProp, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Spacing } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

type WorkplaceDetailRouteProp = RouteProp<RootStackParamList, "WorkplaceDetail">;

type Workplace = {
  id: string;
  name: string;
  addressLine1: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  geofenceRadiusMeters: number;
  isActive: boolean;
};

type WorkerAssignment = {
  id: string;
  workerUserId: string;
  status: string;
  invitedAt: string;
  acceptedAt: string | null;
  notes: string | null;
  workerName: string;
  workerEmail: string;
  workerRoles: string | null;
};

export default function WorkplaceDetailScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<WorkplaceDetailRouteProp>();
  const { workplaceId } = route.params;
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: workplace, isLoading: loadingWorkplace, refetch: refetchWorkplace } = useQuery<Workplace>({
    queryKey: ["/api/workplaces", workplaceId],
    queryFn: async () => {
      const response = await fetch(new URL(`/api/workplaces/${workplaceId}`, getApiUrl()).toString(), {
        headers: {
          "x-user-id": user?.id || "",
          "x-user-role": user?.role || "",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch workplace");
      return response.json();
    },
  });

  const { data: assignments = [], isLoading: loadingAssignments, refetch: refetchAssignments } = useQuery<WorkerAssignment[]>({
    queryKey: ["/api/workplaces", workplaceId, "workers"],
    queryFn: async () => {
      const response = await fetch(new URL(`/api/workplaces/${workplaceId}/workers`, getApiUrl()).toString(), {
        headers: {
          "x-user-id": user?.id || "",
          "x-user-role": user?.role || "",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch workers");
      return response.json();
    },
  });

  useFocusEffect(
    useCallback(() => {
      refetchWorkplace();
      refetchAssignments();
    }, [refetchWorkplace, refetchAssignments])
  );

  const updateStatusMutation = useMutation({
    mutationFn: async ({ assignmentId, status }: { assignmentId: string; status: string }) => {
      const response = await fetch(new URL(`/api/workplace-assignments/${assignmentId}`, getApiUrl()).toString(), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
          "x-user-role": user?.role || "",
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workplaces", workplaceId, "workers"] });
    },
  });

  const handleStatusChange = (assignment: WorkerAssignment, newStatus: string) => {
    const statusLabels: Record<string, string> = {
      active: "Activate",
      suspended: "Suspend",
      removed: "Remove",
    };
    const message = `${statusLabels[newStatus]} ${assignment.workerName} from this workplace?`;

    if (Platform.OS === "web") {
      if (window.confirm(message)) {
        updateStatusMutation.mutate({ assignmentId: assignment.id, status: newStatus });
      }
    } else {
      Alert.alert("Confirm Action", message, [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: () => updateStatusMutation.mutate({ assignmentId: assignment.id, status: newStatus }) },
      ]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "#22c55e";
      case "invited": return "#f59e0b";
      case "suspended": return "#ef4444";
      case "removed": return "#6b7280";
      default: return "#6b7280";
    }
  };

  const activeWorkers = assignments.filter(a => a.status === "active" || a.status === "invited");

  if (loadingWorkplace || !workplace) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        refreshControl={<RefreshControl refreshing={loadingWorkplace || loadingAssignments} onRefresh={() => { refetchWorkplace(); refetchAssignments(); }} />}
      >
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={[styles.statusBadge, { backgroundColor: workplace.isActive ? "#22c55e" : "#ef4444" }]}>
              <ThemedText style={styles.statusText}>{workplace.isActive ? "Active" : "Inactive"}</ThemedText>
            </View>
            <Pressable onPress={() => navigation.navigate("WorkplaceEdit", { workplaceId: workplace.id })}>
              <Feather name="edit-2" size={20} color={theme.primary} />
            </Pressable>
          </View>
          <ThemedText style={styles.workplaceName}>{workplace.name}</ThemedText>
          <ThemedText style={styles.addressText}>
            {[workplace.addressLine1, workplace.city, workplace.province, workplace.postalCode].filter(Boolean).join(", ") || "No address set"}
          </ThemedText>
        </Card>

        <Card style={styles.infoCard}>
          <ThemedText style={styles.cardTitle}>GPS Settings</ThemedText>
          <View style={styles.infoRow}>
            <Feather name="map-pin" size={18} color={theme.textSecondary} />
            <ThemedText style={styles.infoLabel}>Coordinates:</ThemedText>
            <ThemedText style={styles.infoValue}>
              {workplace.latitude && workplace.longitude 
                ? `${workplace.latitude.toFixed(4)}, ${workplace.longitude.toFixed(4)}`
                : "Not configured"}
            </ThemedText>
          </View>
          <View style={styles.infoRow}>
            <Feather name="circle" size={18} color={theme.textSecondary} />
            <ThemedText style={styles.infoLabel}>Geofence Radius:</ThemedText>
            <ThemedText style={styles.infoValue}>{workplace.geofenceRadiusMeters}m</ThemedText>
          </View>
          {(!workplace.latitude || !workplace.longitude) && (
            <View style={styles.warningBox}>
              <Feather name="alert-triangle" size={16} color="#f59e0b" />
              <ThemedText style={styles.warningText}>
                GPS coordinates required for TITO validation
              </ThemedText>
            </View>
          )}
        </Card>

        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Assigned Workers ({activeWorkers.length})</ThemedText>
          <Pressable 
            onPress={() => navigation.navigate("InviteWorker", { workplaceId })}
            style={styles.addButton}
          >
            <Feather name="user-plus" size={18} color={theme.primary} />
            <ThemedText style={[styles.addButtonText, { color: theme.primary }]}>Add</ThemedText>
          </Pressable>
        </View>

        {activeWorkers.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Feather name="users" size={32} color={theme.textSecondary} />
            <ThemedText style={styles.emptyText}>No workers assigned</ThemedText>
            <Button 
              title="Invite Worker"
              onPress={() => navigation.navigate("InviteWorker", { workplaceId })}
              style={styles.emptyButton}
            />
          </Card>
        ) : (
          activeWorkers.map((assignment) => (
            <Card key={assignment.id} style={styles.workerCard}>
              <View style={styles.workerHeader}>
                <View style={styles.workerInfo}>
                  <ThemedText style={styles.workerName}>{assignment.workerName}</ThemedText>
                  <ThemedText style={styles.workerEmail}>{assignment.workerEmail}</ThemedText>
                </View>
                <View style={[styles.workerStatusBadge, { backgroundColor: getStatusColor(assignment.status) + "20" }]}>
                  <ThemedText style={[styles.workerStatusText, { color: getStatusColor(assignment.status) }]}>
                    {assignment.status}
                  </ThemedText>
                </View>
              </View>
              {assignment.workerRoles && (
                <ThemedText style={styles.workerRoles}>
                  Roles: {JSON.parse(assignment.workerRoles).join(", ")}
                </ThemedText>
              )}
              <View style={styles.workerActions}>
                {assignment.status !== "active" && (
                  <Pressable 
                    style={styles.actionButton}
                    onPress={() => handleStatusChange(assignment, "active")}
                  >
                    <Feather name="check" size={16} color="#22c55e" />
                    <ThemedText style={[styles.actionText, { color: "#22c55e" }]}>Activate</ThemedText>
                  </Pressable>
                )}
                {assignment.status !== "suspended" && (
                  <Pressable 
                    style={styles.actionButton}
                    onPress={() => handleStatusChange(assignment, "suspended")}
                  >
                    <Feather name="pause" size={16} color="#f59e0b" />
                    <ThemedText style={[styles.actionText, { color: "#f59e0b" }]}>Suspend</ThemedText>
                  </Pressable>
                )}
                <Pressable 
                  style={styles.actionButton}
                  onPress={() => handleStatusChange(assignment, "removed")}
                >
                  <Feather name="x" size={16} color="#ef4444" />
                  <ThemedText style={[styles.actionText, { color: "#ef4444" }]}>Remove</ThemedText>
                </Pressable>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  headerCard: {
    padding: Spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  workplaceName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  addressText: {
    fontSize: 15,
    opacity: 0.6,
  },
  infoCard: {
    padding: Spacing.lg,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    opacity: 0.6,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    padding: Spacing.sm,
    borderRadius: 8,
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  warningText: {
    fontSize: 13,
    color: "#92400e",
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  emptyCard: {
    padding: Spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    opacity: 0.6,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  emptyButton: {
    minWidth: 140,
  },
  workerCard: {
    padding: Spacing.md,
  },
  workerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.xs,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: "600",
  },
  workerEmail: {
    fontSize: 13,
    opacity: 0.6,
  },
  workerStatusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  workerStatusText: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  workerRoles: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: Spacing.sm,
  },
  workerActions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
    paddingTop: Spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
