import React, { useCallback, useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert, Platform, RefreshControl, TextInput, Modal } from "react-native";
import Checkbox from "expo-checkbox";
import { Feather } from "@expo/vector-icons";
import { useNavigation, NavigationProp, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DateTimePicker from "@react-native-community/datetimepicker";

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
import { APIShift, ShiftStatus, ShiftFrequency, ShiftCategory } from "@/types";

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

const FREQUENCY_OPTIONS: { value: ShiftFrequency; label: string }[] = [
  { value: "one-time", label: "One-Time" },
  { value: "recurring", label: "Recurring" },
  { value: "open-ended", label: "Open-Ended" },
];

const CATEGORY_OPTIONS: { value: ShiftCategory; label: string }[] = [
  { value: "hotel", label: "Hotel" },
  { value: "banquet", label: "Banquet" },
  { value: "janitorial", label: "Janitorial" },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CATEGORY_COLORS: Record<ShiftCategory, string> = {
  hotel: "#6366f1",
  banquet: "#f59e0b",
  janitorial: "#10b981",
};

const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatTime = (date: Date): string => {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
};

const formatDisplayDate = (date: Date): string => {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
};

const formatDisplayTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
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
  const [shiftDate, setShiftDate] = useState(new Date());
  const [shiftStartTime, setShiftStartTime] = useState(new Date());
  const [shiftEndTime, setShiftEndTime] = useState(new Date());
  const [shiftNotes, setShiftNotes] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [frequencyType, setFrequencyType] = useState<ShiftFrequency>("one-time");
  const [category, setCategory] = useState<ShiftCategory>("hotel");
  const [recurringDays, setRecurringDays] = useState<string[]>([]);
  const [recurringEndDate, setRecurringEndDate] = useState(new Date());

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [showRecurringEndDatePicker, setShowRecurringEndDatePicker] = useState(false);

  const [webDateText, setWebDateText] = useState("");
  const [webStartTimeText, setWebStartTimeText] = useState("");
  const [webEndTimeText, setWebEndTimeText] = useState("");
  const [webRecurringEndDateText, setWebRecurringEndDateText] = useState("");

  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: string; title: string } | null>(null);
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<{ assignmentId: string; status: string; message: string } | null>(null);
  const [noEndDate, setNoEndDate] = useState(false);

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
    setShiftDate(new Date());
    setShiftStartTime(new Date());
    setShiftEndTime(new Date());
    setShiftNotes("");
    setSelectedWorkerId("");
    setFrequencyType("one-time");
    setCategory("hotel");
    setRecurringDays([]);
    setRecurringEndDate(new Date());
    setNoEndDate(false);
    setShowDatePicker(false);
    setShowStartTimePicker(false);
    setShowEndTimePicker(false);
    setShowRecurringEndDatePicker(false);
    setWebDateText("");
    setWebStartTimeText("");
    setWebEndTimeText("");
    setWebRecurringEndDateText("");
  };

  const handleCreateShift = () => {
    if (!shiftTitle || !selectedWorkerId) return;

    const dateStr = Platform.OS === "web" && webDateText ? webDateText : formatDate(shiftDate);
    const startTimeStr = Platform.OS === "web" && webStartTimeText ? webStartTimeText : formatTime(shiftStartTime);
    const endTimeStr = frequencyType !== "open-ended"
      ? (Platform.OS === "web" && webEndTimeText ? webEndTimeText : formatTime(shiftEndTime))
      : undefined;

    if (!dateStr || !startTimeStr) return;
    if (frequencyType !== "open-ended" && !endTimeStr) return;
    if (frequencyType === "recurring" && recurringDays.length === 0) return;

    const recurringEndDateStr = frequencyType === "recurring" && !noEndDate && (Platform.OS === "web" ? webRecurringEndDateText : formatDate(recurringEndDate));

    createShiftMutation.mutate({
      workplaceId,
      workerUserId: selectedWorkerId,
      title: shiftTitle,
      date: dateStr,
      startTime: startTimeStr,
      endTime: endTimeStr || null,
      notes: shiftNotes || undefined,
      frequencyType,
      category,
      recurringDays: frequencyType === "recurring" ? recurringDays.join(",") : null,
      recurringEndDate: frequencyType === "recurring" && recurringEndDateStr ? recurringEndDateStr : null,
    });
  };

  const handleDeleteShift = (shiftId: string, shiftTitle: string) => {
    setDeleteConfirmTarget({ id: shiftId, title: shiftTitle });
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
    setStatusConfirmTarget({ assignmentId: assignment.id, status: newStatus, message });
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

  const toggleRecurringDay = (day: string) => {
    setRecurringDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const getFrequencyLabel = (freq: ShiftFrequency | null | undefined): string => {
    switch (freq) {
      case "recurring": return "Recurring";
      case "open-ended": return "Open-Ended";
      default: return "One-Time";
    }
  };

  const getRecurringDaysDisplay = (days: string | null): string => {
    if (!days) return "";
    return days.split(",").join(", ");
  };

  const isCreateDisabled = (): boolean => {
    if (!shiftTitle || !selectedWorkerId || createShiftMutation.isPending) return true;

    if (Platform.OS === "web") {
      if (!webDateText || !webStartTimeText) return true;
      if (frequencyType !== "open-ended" && !webEndTimeText) return true;
    }

    if (frequencyType === "recurring" && recurringDays.length === 0) return true;
    return false;
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
          {(!workplace.latitude || !workplace.longitude) ? (
            <View style={styles.warningBox}>
              <Feather name="alert-triangle" size={16} color="#f59e0b" />
              <ThemedText style={styles.warningText}>
                GPS coordinates required for TITO validation
              </ThemedText>
            </View>
          ) : null}
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
              {assignment.workerRoles ? (
                <ThemedText style={styles.workerRoles}>
                  Roles: {JSON.parse(assignment.workerRoles).join(", ")}
                </ThemedText>
              ) : null}
              <View style={styles.workerActions}>
                {assignment.status !== "active" ? (
                  <Pressable 
                    style={styles.actionButton}
                    onPress={() => handleStatusChange(assignment, "active")}
                  >
                    <Feather name="check" size={16} color="#22c55e" />
                    <ThemedText style={[styles.actionText, { color: "#22c55e" }]}>Activate</ThemedText>
                  </Pressable>
                ) : null}
                {assignment.status !== "suspended" ? (
                  <Pressable 
                    style={styles.actionButton}
                    onPress={() => handleStatusChange(assignment, "suspended")}
                  >
                    <Feather name="pause" size={16} color="#f59e0b" />
                    <ThemedText style={[styles.actionText, { color: "#f59e0b" }]}>Suspend</ThemedText>
                  </Pressable>
                ) : null}
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
              if (activeWorkers.length === 1) {
                setSelectedWorkerId(activeWorkers[0].workerUserId);
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
                onPress={() => {
                  if (activeWorkers.length === 1) {
                    setSelectedWorkerId(activeWorkers[0].workerUserId);
                  }
                  setShowCreateShift(true);
                }}
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

              <View style={styles.shiftBadgeRow}>
                {shift.category ? (
                  <View style={[styles.categoryBadge, { backgroundColor: (CATEGORY_COLORS[shift.category as ShiftCategory] || "#6b7280") + "20" }]}>
                    <ThemedText style={[styles.categoryBadgeText, { color: CATEGORY_COLORS[shift.category as ShiftCategory] || "#6b7280" }]}>
                      {shift.category.charAt(0).toUpperCase() + shift.category.slice(1)}
                    </ThemedText>
                  </View>
                ) : null}
                {shift.frequencyType ? (
                  <View style={[styles.frequencyBadge, { backgroundColor: theme.primary + "15" }]}>
                    <Feather
                      name={shift.frequencyType === "recurring" ? "repeat" : shift.frequencyType === "open-ended" ? "clock" : "calendar"}
                      size={11}
                      color={theme.primary}
                      style={{ marginRight: 4 }}
                    />
                    <ThemedText style={[styles.frequencyBadgeText, { color: theme.primary }]}>
                      {getFrequencyLabel(shift.frequencyType)}
                    </ThemedText>
                  </View>
                ) : null}
              </View>

              <View style={styles.shiftItemDetails}>
                <View style={styles.shiftDetailRow}>
                  <Feather name="clock" size={14} color={theme.textSecondary} />
                  <ThemedText style={styles.shiftDetailText}>
                    {shift.startTime}{shift.endTime ? ` - ${shift.endTime}` : " (Open-Ended)"}
                  </ThemedText>
                </View>
                {shift.workerName ? (
                  <View style={styles.shiftDetailRow}>
                    <Feather name="user" size={14} color={theme.textSecondary} />
                    <ThemedText style={styles.shiftDetailText}>{shift.workerName}</ThemedText>
                  </View>
                ) : null}
                {shift.frequencyType === "recurring" && shift.recurringDays ? (
                  <View style={styles.shiftDetailRow}>
                    <Feather name="repeat" size={14} color={theme.textSecondary} />
                    <ThemedText style={styles.shiftDetailText}>{getRecurringDaysDisplay(shift.recurringDays)}</ThemedText>
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

              <ThemedText style={styles.fieldLabel}>Category</ThemedText>
              <View style={styles.chipRow}>
                {CATEGORY_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setCategory(opt.value)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: category === opt.value ? (CATEGORY_COLORS[opt.value] + "20") : theme.backgroundSecondary,
                        borderColor: category === opt.value ? CATEGORY_COLORS[opt.value] : theme.border,
                      },
                    ]}
                    testID={`chip-category-${opt.value}`}
                  >
                    <ThemedText style={[
                      styles.chipText,
                      { color: category === opt.value ? CATEGORY_COLORS[opt.value] : theme.textSecondary },
                    ]}>{opt.label}</ThemedText>
                  </Pressable>
                ))}
              </View>

              <ThemedText style={styles.fieldLabel}>Frequency</ThemedText>
              <View style={styles.chipRow}>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => setFrequencyType(opt.value)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: frequencyType === opt.value ? theme.primary + "20" : theme.backgroundSecondary,
                        borderColor: frequencyType === opt.value ? theme.primary : theme.border,
                      },
                    ]}
                    testID={`chip-frequency-${opt.value}`}
                  >
                    <ThemedText style={[
                      styles.chipText,
                      { color: frequencyType === opt.value ? theme.primary : theme.textSecondary },
                    ]}>{opt.label}</ThemedText>
                  </Pressable>
                ))}
              </View>

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
                    {selectedWorkerId === w.workerUserId ? (
                      <Feather name="check-circle" size={16} color={theme.primary} style={{ marginRight: 6 }} />
                    ) : (
                      <Feather name="circle" size={16} color={theme.textMuted} style={{ marginRight: 6 }} />
                    )}
                    <ThemedText style={[
                      styles.workerOptionText,
                      selectedWorkerId === w.workerUserId ? { color: theme.primary, fontWeight: "600" } : undefined,
                    ]}>{w.workerName}</ThemedText>
                  </Pressable>
                ))}
              </View>

              <ThemedText style={styles.fieldLabel}>Date</ThemedText>
              {Platform.OS === "web" ? (
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                  value={webDateText}
                  onChangeText={setWebDateText}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textMuted}
                  testID="input-shift-date"
                />
              ) : (
                <View>
                  <Pressable
                    onPress={() => setShowDatePicker(true)}
                    style={[styles.pickerButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                  >
                    <Feather name="calendar" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
                    <ThemedText style={styles.pickerButtonText}>{formatDisplayDate(shiftDate)}</ThemedText>
                  </Pressable>
                  {showDatePicker ? (
                    <DateTimePicker
                      value={shiftDate}
                      mode="date"
                      display="default"
                      onChange={(event, selectedDate) => {
                        setShowDatePicker(Platform.OS === "ios");
                        if (selectedDate) setShiftDate(selectedDate);
                      }}
                      testID="picker-shift-date"
                    />
                  ) : null}
                </View>
              )}

              <View style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.fieldLabel}>Start Time</ThemedText>
                  {Platform.OS === "web" ? (
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                      value={webStartTimeText}
                      onChangeText={setWebStartTimeText}
                      placeholder="HH:mm"
                      placeholderTextColor={theme.textMuted}
                      testID="input-shift-start"
                    />
                  ) : (
                    <View>
                      <Pressable
                        onPress={() => setShowStartTimePicker(true)}
                        style={[styles.pickerButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                      >
                        <Feather name="clock" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
                        <ThemedText style={styles.pickerButtonText}>{formatDisplayTime(shiftStartTime)}</ThemedText>
                      </Pressable>
                      {showStartTimePicker ? (
                        <DateTimePicker
                          value={shiftStartTime}
                          mode="time"
                          display="default"
                          onChange={(event, selectedDate) => {
                            setShowStartTimePicker(Platform.OS === "ios");
                            if (selectedDate) setShiftStartTime(selectedDate);
                          }}
                          testID="picker-shift-start"
                        />
                      ) : null}
                    </View>
                  )}
                </View>
                {frequencyType !== "open-ended" ? (
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.fieldLabel}>End Time</ThemedText>
                    {Platform.OS === "web" ? (
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                        value={webEndTimeText}
                        onChangeText={setWebEndTimeText}
                        placeholder="HH:mm"
                        placeholderTextColor={theme.textMuted}
                        testID="input-shift-end"
                      />
                    ) : (
                      <View>
                        <Pressable
                          onPress={() => setShowEndTimePicker(true)}
                          style={[styles.pickerButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                        >
                          <Feather name="clock" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
                          <ThemedText style={styles.pickerButtonText}>{formatDisplayTime(shiftEndTime)}</ThemedText>
                        </Pressable>
                        {showEndTimePicker ? (
                          <DateTimePicker
                            value={shiftEndTime}
                            mode="time"
                            display="default"
                            onChange={(event, selectedDate) => {
                              setShowEndTimePicker(Platform.OS === "ios");
                              if (selectedDate) setShiftEndTime(selectedDate);
                            }}
                            testID="picker-shift-end"
                          />
                        ) : null}
                      </View>
                    )}
                  </View>
                ) : null}
              </View>

              {frequencyType === "recurring" ? (
                <View>
                  <ThemedText style={styles.fieldLabel}>Recurring Days</ThemedText>
                  <View style={styles.dayPickerRow}>
                    {DAY_LABELS.map((day) => (
                      <Pressable
                        key={day}
                        onPress={() => toggleRecurringDay(day)}
                        style={[
                          styles.dayButton,
                          {
                            backgroundColor: recurringDays.includes(day) ? theme.primary : theme.backgroundSecondary,
                            borderColor: recurringDays.includes(day) ? theme.primary : theme.border,
                          },
                        ]}
                        testID={`day-toggle-${day}`}
                      >
                        <ThemedText style={[
                          styles.dayButtonText,
                          { color: recurringDays.includes(day) ? "#fff" : theme.textSecondary },
                        ]}>{day}</ThemedText>
                      </Pressable>
                    ))}
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <Checkbox
                      value={noEndDate}
                      onValueChange={setNoEndDate}
                      color={noEndDate ? theme.primary : undefined}
                      testID="checkbox-no-end-date"
                    />
                    <ThemedText style={{ fontSize: 14, color: theme.text }}>No End Date (ongoing)</ThemedText>
                  </View>
                  {!noEndDate ? (
                    <View>
                      <ThemedText style={styles.fieldLabel}>End Date</ThemedText>
                      {Platform.OS === "web" ? (
                        <TextInput
                          style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, borderColor: theme.border }]}
                          value={webRecurringEndDateText}
                          onChangeText={setWebRecurringEndDateText}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor={theme.textMuted}
                          testID="input-recurring-end-date"
                        />
                      ) : (
                        <View>
                          <Pressable
                            onPress={() => setShowRecurringEndDatePicker(true)}
                            style={[styles.pickerButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                          >
                            <Feather name="calendar" size={16} color={theme.textSecondary} style={{ marginRight: 8 }} />
                            <ThemedText style={styles.pickerButtonText}>{formatDisplayDate(recurringEndDate)}</ThemedText>
                          </Pressable>
                          {showRecurringEndDatePicker ? (
                            <DateTimePicker
                              value={recurringEndDate}
                              mode="date"
                              display="default"
                              onChange={(event, selectedDate) => {
                                setShowRecurringEndDatePicker(Platform.OS === "ios");
                                if (selectedDate) setRecurringEndDate(selectedDate);
                              }}
                              testID="picker-recurring-end-date"
                            />
                          ) : null}
                        </View>
                      )}
                    </View>
                  ) : null}
                </View>
              ) : null}

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
                disabled={isCreateDisabled()}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={deleteConfirmTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirmTarget(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 }}
          onPress={() => setDeleteConfirmTarget(null)}
        >
          <Pressable
            style={{ backgroundColor: theme.backgroundDefault, borderRadius: 12, padding: 24, width: "100%", maxWidth: 340 }}
            onPress={() => {}}
          >
            <ThemedText type="h4" style={{ marginBottom: 12 }}>Delete Shift</ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 24 }}>
              Are you sure you want to delete "{deleteConfirmTarget?.title}"? This will also remove all associated offers and check-ins.
            </ThemedText>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => setDeleteConfirmTarget(null)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center", backgroundColor: theme.backgroundSecondary }}
              >
                <ThemedText style={{ color: theme.text, fontWeight: "600" }}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (deleteConfirmTarget) {
                    deleteShiftMutation.mutate(deleteConfirmTarget.id);
                    setDeleteConfirmTarget(null);
                  }
                }}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center", backgroundColor: "#EF4444" }}
              >
                <ThemedText style={{ color: "#fff", fontWeight: "600" }}>Delete</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={statusConfirmTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusConfirmTarget(null)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 }}
          onPress={() => setStatusConfirmTarget(null)}
        >
          <Pressable
            style={{ backgroundColor: theme.backgroundDefault, borderRadius: 12, padding: 24, width: "100%", maxWidth: 340 }}
            onPress={() => {}}
          >
            <ThemedText type="h4" style={{ marginBottom: 12 }}>Confirm Action</ThemedText>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 24 }}>
              {statusConfirmTarget?.message}
            </ThemedText>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() => setStatusConfirmTarget(null)}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center", backgroundColor: theme.backgroundSecondary }}
              >
                <ThemedText style={{ color: theme.text, fontWeight: "600" }}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (statusConfirmTarget) {
                    updateStatusMutation.mutate({ assignmentId: statusConfirmTarget.assignmentId, status: statusConfirmTarget.status });
                    setStatusConfirmTarget(null);
                  }
                }}
                style={{ flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center", backgroundColor: theme.primary }}
              >
                <ThemedText style={{ color: "#fff", fontWeight: "600" }}>Confirm</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
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
    marginBottom: Spacing.xs,
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
  shiftBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  frequencyBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  frequencyBadgeText: {
    fontSize: 11,
    fontWeight: "600",
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
    flexDirection: "row",
    alignItems: "center",
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
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  pickerButton: {
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
  },
  pickerButtonText: {
    fontSize: 15,
  },
  dayPickerRow: {
    flexDirection: "row",
    gap: Spacing.xs,
    flexWrap: "wrap",
  },
  dayButton: {
    width: 42,
    height: 42,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
