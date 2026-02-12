import React, { useCallback, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, Platform, RefreshControl, TextInput, Modal } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, NavigationProp, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { StatusPill } from "@/components/StatusPill";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { APIShift, ShiftStatus } from "@/types";

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
  });

  const { data: assignments = [], isLoading: loadingAssignments, refetch: refetchAssignments } = useQuery<WorkerAssignment[]>({
    queryKey: ["/api/workplaces", workplaceId, "workers"],
  });

  const { data: workplaceShifts = [], isLoading: loadingShifts, refetch: refetchShifts } = useQuery<APIShift[]>({
    queryKey: ["/api/shifts?workplaceId=" + workplaceId],
  });

  const [showCreateShift, setShowCreateShift] = useState(false);
  const [shiftTitle, setShiftTitle] = useState("");
  const [shiftDate, setShiftDate] = useState("");
  const [shiftStartTime, setShiftStartTime] = useState("");
  const [shiftEndTime, setShiftEndTime] = useState("");
  const [shiftNotes, setShiftNotes] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState("");

  const createShiftMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/shifts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
      setShowCreateShift(false);
      resetShiftForm();
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      const res = await apiRequest("DELETE", `/api/shifts/${shiftId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shifts"] });
    },
  });

  const resetShiftForm = () => {
    setShiftTitle("");
    setShiftDate("");
    setShiftStartTime("");
    setShiftEndTime("");
    setShiftNotes("");
    setSelectedWorkerId("");
  };

  const handleCreateShift = () => {
    if (!shiftTitle || !shiftDate || !shiftStartTime || !shiftEndTime || !selectedWorkerId) return;
    createShiftMutation.mutate({
      workplaceId,
      workerUserId: selectedWorkerId,
      title: shiftTitle,
      date: shiftDate,
      startTime: shiftStartTime,
      endTime: shiftEndTime,
      notes: shiftNotes || undefined,
    });
  };

  const handleDeleteShift = (shiftId: string, shiftTitle: string) => {
    if (Platform.OS === "web") {
      if (window.confirm(`Delete shift "${shiftTitle}"?`)) {
        deleteShiftMutation.mutate(shiftId);
      }
    } else {
      Alert.alert("Delete Shift", `Delete shift "${shiftTitle}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteShiftMutation.mutate(shiftId) },
      ]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      refetchWorkplace();
      refetchAssignments();
      refetchShifts();
    }, [refetchWorkplace, refetchAssignments, refetchShifts])
  );

  const updateStatusMutation = useMutation({
    mutationFn: async ({ assignmentId, status }: { assignmentId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/workplace-assignments/${assignmentId}`, { status });
      return res.json();
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
        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Scheduled Shifts ({workplaceShifts.length})</ThemedText>
          <Pressable 
            onPress={() => {
              if (activeWorkers.length === 0) {
                if (Platform.OS === "web") {
                  window.alert("Assign workers to this workplace before creating shifts.");
                } else {
                  Alert.alert("No Workers", "Assign workers to this workplace before creating shifts.");
                }
                return;
              }
              setShowCreateShift(true);
            }}
            style={styles.addButton}
          >
            <Feather name="plus" size={18} color={theme.primary} />
            <ThemedText style={[styles.addButtonText, { color: theme.primary }]}>Schedule</ThemedText>
          </Pressable>
        </View>

        {workplaceShifts.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Feather name="calendar" size={32} color={theme.textSecondary} />
            <ThemedText style={styles.emptyText}>No shifts scheduled</ThemedText>
            {activeWorkers.length > 0 ? (
              <Button
                title="Schedule Shift"
                onPress={() => setShowCreateShift(true)}
                style={styles.emptyButton}
              />
            ) : null}
          </Card>
        ) : (
          workplaceShifts.map((shift) => (
            <Card key={shift.id} style={styles.shiftItemCard}>
              <View style={styles.shiftItemHeader}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.shiftItemTitle}>{shift.title}</ThemedText>
                  <ThemedText style={styles.shiftItemDate}>
                    {new Date(shift.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </ThemedText>
                </View>
                <View style={styles.shiftItemActions}>
                  <StatusPill status={shift.status as ShiftStatus} size="sm" />
                  <Pressable onPress={() => handleDeleteShift(shift.id, shift.title)}>
                    <Feather name="trash-2" size={16} color="#ef4444" />
                  </Pressable>
                </View>
              </View>
              <View style={styles.shiftItemDetails}>
                <View style={styles.shiftDetailRow}>
                  <Feather name="clock" size={14} color={theme.textSecondary} />
                  <ThemedText style={styles.shiftDetailText}>{shift.startTime} - {shift.endTime}</ThemedText>
                </View>
                {shift.workerName ? (
                  <View style={styles.shiftDetailRow}>
                    <Feather name="user" size={14} color={theme.textSecondary} />
                    <ThemedText style={styles.shiftDetailText}>{shift.workerName}</ThemedText>
                  </View>
                ) : null}
                {shift.notes ? (
                  <ThemedText style={[styles.shiftNotes, { color: theme.textMuted }]}>{shift.notes}</ThemedText>
                ) : null}
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <Modal
        visible={showCreateShift}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateShift(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Schedule Shift</ThemedText>
              <Pressable onPress={() => { setShowCreateShift(false); resetShiftForm(); }}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.fieldLabel}>Shift Title</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                value={shiftTitle}
                onChangeText={setShiftTitle}
                placeholder="e.g. Morning Shift"
                placeholderTextColor={theme.textMuted}
                testID="input-shift-title"
              />

              <ThemedText style={styles.fieldLabel}>Assign Worker</ThemedText>
              <View style={styles.workerPicker}>
                {activeWorkers.map((w) => (
                  <Pressable
                    key={w.id}
                    onPress={() => setSelectedWorkerId(w.workerUserId)}
                    style={[
                      styles.workerOption,
                      {
                        backgroundColor: selectedWorkerId === w.workerUserId ? theme.primary + "20" : theme.backgroundSecondary,
                        borderColor: selectedWorkerId === w.workerUserId ? theme.primary : theme.border,
                      },
                    ]}
                    testID={`worker-option-${w.workerUserId}`}
                  >
                    <ThemedText style={[
                      styles.workerOptionText,
                      selectedWorkerId === w.workerUserId ? { color: theme.primary, fontWeight: "600" } : undefined,
                    ]}>{w.workerName}</ThemedText>
                  </Pressable>
                ))}
              </View>

              <ThemedText style={styles.fieldLabel}>Date (YYYY-MM-DD)</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                value={shiftDate}
                onChangeText={setShiftDate}
                placeholder="2026-02-15"
                placeholderTextColor={theme.textMuted}
                testID="input-shift-date"
              />

              <View style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.fieldLabel}>Start Time</ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                    value={shiftStartTime}
                    onChangeText={setShiftStartTime}
                    placeholder="09:00"
                    placeholderTextColor={theme.textMuted}
                    testID="input-shift-start"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.fieldLabel}>End Time</ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                    value={shiftEndTime}
                    onChangeText={setShiftEndTime}
                    placeholder="17:00"
                    placeholderTextColor={theme.textMuted}
                    testID="input-shift-end"
                  />
                </View>
              </View>

              <ThemedText style={styles.fieldLabel}>Notes (optional)</ThemedText>
              <TextInput
                style={[styles.input, styles.notesInput, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                value={shiftNotes}
                onChangeText={setShiftNotes}
                placeholder="Any additional notes..."
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={3}
                testID="input-shift-notes"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => { setShowCreateShift(false); resetShiftForm(); }}
                variant="outline"
                style={{ flex: 1 }}
              />
              <Button
                title={createShiftMutation.isPending ? "Creating..." : "Create Shift"}
                onPress={handleCreateShift}
                disabled={!shiftTitle || !shiftDate || !shiftStartTime || !shiftEndTime || !selectedWorkerId || createShiftMutation.isPending}
                style={{ flex: 1 }}
                testID="button-create-shift"
              />
            </View>
          </View>
        </View>
      </Modal>
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
  shiftItemCard: {
    padding: Spacing.md,
  },
  shiftItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  shiftItemTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  shiftItemDate: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 2,
  },
  shiftItemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  shiftItemDetails: {
    gap: Spacing.xs,
  },
  shiftDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  shiftDetailText: {
    fontSize: 13,
  },
  shiftNotes: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  modalForm: {
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  notesInput: {
    height: 80,
    paddingTop: Spacing.sm,
    textAlignVertical: "top",
  },
  workerPicker: {
    gap: Spacing.xs,
  },
  workerOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  workerOptionText: {
    fontSize: 14,
  },
  timeRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  modalActions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
});
