import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Platform,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Layout, BorderRadius } from "@/constants/theme";
import { useIsWideWeb } from "@/components/WebSidebarLayout";
import { apiRequest } from "@/lib/query-client";

type Appointment = {
  id: string;
  title: string;
  companyName: string;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  appointmentDate: string;
  location: string | null;
  address: string | null;
  leadSource: string;
  status: string;
  assignedUserId: string | null;
  assignedUserName?: string;
  notes: string | null;
  outcome: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_FILTERS = ["all", "scheduled", "completed", "cancelled", "no_show"] as const;
const STATUS_LABELS: Record<string, string> = {
  all: "All",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

const LEAD_SOURCES = ["cold_call", "lead_generation", "referral", "website", "other"] as const;
const LEAD_SOURCE_LABELS: Record<string, string> = {
  cold_call: "Cold Call",
  lead_generation: "Lead Gen",
  referral: "Referral",
  website: "Website",
  other: "Other",
};

function getStatusColor(status: string) {
  switch (status) {
    case "scheduled": return "#3B82F6";
    case "completed": return "#10B981";
    case "cancelled": return "#94A3B8";
    case "no_show": return "#EF4444";
    case "rescheduled": return "#F59E0B";
    default: return "#64748B";
  }
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch { return dateStr; }
}

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  } catch { return ""; }
}

const EMPTY_FORM = {
  title: "",
  companyName: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  appointmentDate: "",
  location: "",
  address: "",
  leadSource: "cold_call",
  notes: "",
};

export default function AppointmentsScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const isWideWeb = useIsWideWeb();
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [outcomeInput, setOutcomeInput] = useState<{ id: string; text: string } | null>(null);

  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? Spacing.md : headerHeight + Spacing.md;

  const queryKey =
    statusFilter === "all"
      ? ["/api/appointments"]
      : [`/api/appointments?status=${statusFilter}`];

  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({ queryKey });

  const createMutation = useMutation({
    mutationFn: async (data: typeof EMPTY_FORM) => {
      await apiRequest("POST", "/api/appointments", data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/appointments"] });
      setModalVisible(false);
      setForm({ ...EMPTY_FORM });
    },
  });

  const patchMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      await apiRequest("PATCH", `/api/appointments/${id}`, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/appointments"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/appointments/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/appointments"] }),
  });

  const sendSmsMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/appointments/${id}/send-sms`, {});
    },
  });

  const handleSave = useCallback(() => {
    if (!form.companyName.trim() || !form.contactName.trim()) return;
    createMutation.mutate(form);
  }, [form]);

  const renderFilterBar = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterBar}
      contentContainerStyle={styles.filterBarContent}
    >
      {STATUS_FILTERS.map((s) => {
        const active = statusFilter === s;
        return (
          <Pressable
            key={s}
            testID={`filter-${s}`}
            onPress={() => setStatusFilter(s)}
            style={[
              styles.filterChip,
              { backgroundColor: active ? theme.primary : theme.backgroundSecondary },
            ]}
          >
            <ThemedText
              style={[styles.filterChipText, { color: active ? "#fff" : theme.textSecondary }]}
            >
              {STATUS_LABELS[s]}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const renderItem = ({ item }: { item: Appointment }) => {
    const expanded = expandedId === item.id;
    const statusColor = getStatusColor(item.status);

    return (
      <Card
        style={styles.appointmentCard}
        onPress={() => setExpandedId(expanded ? null : item.id)}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.companyName}>{item.companyName}</ThemedText>
            <ThemedText style={styles.contactInfo}>
              {item.contactName}
              {item.contactPhone ? `  ${item.contactPhone}` : ""}
            </ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
            <ThemedText style={[styles.statusText, { color: statusColor }]}>
              {STATUS_LABELS[item.status] || item.status}
            </ThemedText>
          </View>
        </View>

        <View style={styles.cardMeta}>
          <View style={styles.metaRow}>
            <Feather name="calendar" size={13} color={theme.textSecondary} />
            <ThemedText style={styles.metaText}>
              {formatDate(item.appointmentDate)} {formatTime(item.appointmentDate)}
            </ThemedText>
          </View>
          {item.location ? (
            <View style={styles.metaRow}>
              <Feather name="map-pin" size={13} color={theme.textSecondary} />
              <ThemedText style={styles.metaText}>{item.location}</ThemedText>
            </View>
          ) : null}
        </View>

        <View style={styles.cardTags}>
          <View style={[styles.leadPill, { backgroundColor: theme.backgroundTertiary }]}>
            <ThemedText style={styles.leadPillText}>
              {LEAD_SOURCE_LABELS[item.leadSource] || item.leadSource}
            </ThemedText>
          </View>
          {item.assignedUserName ? (
            <ThemedText style={styles.assignedText}>{item.assignedUserName}</ThemedText>
          ) : null}
        </View>

        {expanded ? (
          <View style={styles.expandedSection}>
            {item.notes ? (
              <ThemedText style={styles.notesText}>Notes: {item.notes}</ThemedText>
            ) : null}
            {item.outcome ? (
              <ThemedText style={styles.notesText}>Outcome: {item.outcome}</ThemedText>
            ) : null}

            {outcomeInput?.id === item.id ? (
              <View style={styles.outcomeRow}>
                <TextInput
                  testID={`input-outcome-${item.id}`}
                  style={[styles.outcomeInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBackground }]}
                  value={outcomeInput.text}
                  onChangeText={(t) => setOutcomeInput({ id: item.id, text: t })}
                  placeholder="Add notes/outcome..."
                  placeholderTextColor={theme.textMuted}
                />
                <Pressable
                  testID={`button-save-outcome-${item.id}`}
                  onPress={() => {
                    patchMutation.mutate({ id: item.id, data: { outcome: outcomeInput.text } });
                    setOutcomeInput(null);
                  }}
                  style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                >
                  <ThemedText style={styles.actionBtnText}>Save</ThemedText>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.actionRow}>
              {item.status !== "completed" ? (
                <Pressable
                  testID={`button-complete-${item.id}`}
                  onPress={() => patchMutation.mutate({ id: item.id, data: { status: "completed" } })}
                  style={[styles.actionBtn, { backgroundColor: "#10B981" }]}
                >
                  <Feather name="check" size={14} color="#fff" />
                  <ThemedText style={styles.actionBtnText}>Mark Complete</ThemedText>
                </Pressable>
              ) : null}
              <Pressable
                testID={`button-add-notes-${item.id}`}
                onPress={() => setOutcomeInput({ id: item.id, text: item.outcome || "" })}
                style={[styles.actionBtn, { backgroundColor: theme.primary }]}
              >
                <Feather name="edit-2" size={14} color="#fff" />
                <ThemedText style={styles.actionBtnText}>Add Notes</ThemedText>
              </Pressable>
              {item.contactPhone ? (
                <Pressable
                  testID={`button-sms-${item.id}`}
                  onPress={() => sendSmsMutation.mutate(item.id)}
                  disabled={sendSmsMutation.isPending}
                  style={[styles.actionBtn, { backgroundColor: "#6366F1", opacity: sendSmsMutation.isPending ? 0.6 : 1 }]}
                >
                  <Feather name="message-square" size={14} color="#fff" />
                  <ThemedText style={styles.actionBtnText}>Send SMS</ThemedText>
                </Pressable>
              ) : null}
              <Pressable
                testID={`button-cancel-${item.id}`}
                onPress={() => deleteMutation.mutate(item.id)}
                style={[styles.actionBtn, { backgroundColor: "#EF4444" }]}
              >
                <Feather name="x" size={14} color="#fff" />
                <ThemedText style={styles.actionBtnText}>Cancel</ThemedText>
              </Pressable>
            </View>
          </View>
        ) : null}
      </Card>
    );
  };

  const renderFormField = (label: string, key: keyof typeof EMPTY_FORM, opts?: { multiline?: boolean; placeholder?: string; required?: boolean }) => (
    <View style={styles.formGroup}>
      <ThemedText style={styles.formLabel}>
        {label}{opts?.required ? " *" : ""}
      </ThemedText>
      <TextInput
        testID={`input-${key}`}
        style={[
          styles.formInput,
          opts?.multiline ? styles.formTextarea : undefined,
          { color: theme.text, borderColor: theme.border, backgroundColor: theme.inputBackground },
        ]}
        value={form[key]}
        onChangeText={(t) => setForm((prev) => ({ ...prev, [key]: t }))}
        placeholder={opts?.placeholder || label}
        placeholderTextColor={theme.textMuted}
        multiline={opts?.multiline}
      />
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      {renderFilterBar()}
      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: topPadding, paddingBottom: insets.bottom + Spacing.lg + 80 },
          isWideWeb ? { maxWidth: Layout.listMaxWidth, alignSelf: "center" as const, width: "100%" } : undefined,
        ]}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator style={{ marginTop: Spacing.xl }} color={theme.primary} />
          ) : (
            <View style={styles.emptyState}>
              <Feather name="calendar" size={48} color={theme.textMuted} />
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
                No appointments found
              </ThemedText>
            </View>
          )
        }
      />

      <Pressable
        testID="button-create-appointment"
        onPress={() => {
          setForm({ ...EMPTY_FORM });
          setModalVisible(true);
        }}
        style={[styles.fab, { backgroundColor: theme.primary, bottom: insets.bottom + Spacing.lg }]}
      >
        <Feather name="plus" size={24} color="#fff" />
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" transparent testID="modal-create-appointment">
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            { backgroundColor: theme.backgroundDefault },
            isWideWeb ? { maxWidth: Layout.formMaxWidth } : undefined,
          ]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>New Appointment</ThemedText>
              <Pressable testID="button-close-modal" onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {renderFormField("Title", "title")}
              {renderFormField("Company Name", "companyName", { required: true })}
              {renderFormField("Contact Name", "contactName", { required: true })}
              {renderFormField("Contact Phone", "contactPhone")}
              {renderFormField("Contact Email", "contactEmail")}
              {renderFormField("Date/Time (ISO)", "appointmentDate", { placeholder: "2025-01-15T10:00:00Z" })}
              {renderFormField("Location", "location")}
              {renderFormField("Address", "address")}

              <View style={styles.formGroup}>
                <ThemedText style={styles.formLabel}>Lead Source</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.leadSourceRow}>
                  {LEAD_SOURCES.map((ls) => {
                    const active = form.leadSource === ls;
                    return (
                      <Pressable
                        key={ls}
                        testID={`chip-lead-${ls}`}
                        onPress={() => setForm((prev) => ({ ...prev, leadSource: ls }))}
                        style={[
                          styles.filterChip,
                          { backgroundColor: active ? theme.primary : theme.backgroundSecondary, marginRight: Spacing.xs },
                        ]}
                      >
                        <ThemedText style={[styles.filterChipText, { color: active ? "#fff" : theme.textSecondary }]}>
                          {LEAD_SOURCE_LABELS[ls]}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {renderFormField("Notes", "notes", { multiline: true })}

              <Pressable
                testID="button-save-appointment"
                onPress={handleSave}
                disabled={createMutation.isPending}
                style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: createMutation.isPending ? 0.6 : 1 }]}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <ThemedText style={styles.saveBtnText}>Save Appointment</ThemedText>
                )}
              </Pressable>
              <View style={{ height: Spacing.xl }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterBar: { flexGrow: 0 },
  filterBarContent: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.xs },
  filterChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2, borderRadius: BorderRadius.full },
  filterChipText: { fontSize: 13, fontWeight: "600" },
  listContent: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  appointmentCard: { gap: Spacing.xs },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  companyName: { fontSize: 15, fontWeight: "700" },
  contactInfo: { fontSize: 13, opacity: 0.7, marginTop: 2 },
  statusBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
  statusText: { fontSize: 11, fontWeight: "600" },
  cardMeta: { gap: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, opacity: 0.65 },
  cardTags: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginTop: 2 },
  leadPill: { paddingHorizontal: Spacing.sm, paddingVertical: 1, borderRadius: BorderRadius.full },
  leadPillText: { fontSize: 10, fontWeight: "500" },
  assignedText: { fontSize: 11, opacity: 0.6 },
  expandedSection: { marginTop: Spacing.sm, gap: Spacing.sm, borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.06)", paddingTop: Spacing.sm },
  notesText: { fontSize: 13, opacity: 0.7 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2, borderRadius: BorderRadius.md },
  actionBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  outcomeRow: { flexDirection: "row", gap: Spacing.xs, alignItems: "center" },
  outcomeInput: { flex: 1, borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, fontSize: 13 },
  emptyState: { alignItems: "center", marginTop: 60, gap: Spacing.md },
  emptyText: { fontSize: 15 },
  fab: { position: "absolute", right: Spacing.lg, width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, maxHeight: "90%", width: "100%", alignSelf: "center" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  modalBody: { paddingHorizontal: Spacing.lg },
  formGroup: { marginBottom: Spacing.md },
  formLabel: { fontSize: 13, fontWeight: "600", marginBottom: 4 },
  formInput: { borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm + 2, fontSize: 15 },
  formTextarea: { minHeight: 80, textAlignVertical: "top" },
  leadSourceRow: { flexGrow: 0 },
  saveBtn: { paddingVertical: Spacing.md, borderRadius: BorderRadius.md, alignItems: "center", marginTop: Spacing.sm },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
