import React, { useState } from "react";
import { View, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, Modal, ActivityIndicator } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { getErrorMessage } from "@/utils/errorHandler";

type InviteWorkerRouteProp = RouteProp<RootStackParamList, "InviteWorker">;

type Worker = {
  id: string;
  email: string;
  fullName: string;
  onboardingStatus: string | null;
  workerRoles: string | null;
  isActive: boolean;
};

export default function InviteWorkerScreen() {
  const navigation = useNavigation();
  const route = useRoute<InviteWorkerRouteProp>();
  const { workplaceId } = route.params;
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data: workers = [], isLoading, refetch } = useQuery<Worker[]>({
    queryKey: ["/api/workers"],
  });

  const { data: existingAssignments = [] } = useQuery<{ workerUserId: string }[]>({
    queryKey: ["/api/workplaces", workplaceId, "workers"],
  });

  const inviteMutation = useMutation({
    mutationFn: async (workerId: string) => {
      const res = await apiRequest("POST", `/api/workplaces/${workplaceId}/invite-worker`, { workerUserId: workerId, status: "active" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workplaces", workplaceId, "workers"] });
      setShowConfirmModal(false);
      setFeedbackMessage({ type: "success", text: `${selectedWorker?.fullName || "Worker"} has been assigned to this workplace` });
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    },
    onError: (error: Error) => {
      setShowConfirmModal(false);
      setFeedbackMessage({ type: "error", text: getErrorMessage(error) });
    },
  });

  const assignedWorkerIds = new Set(existingAssignments.map(a => a.workerUserId));
  
  const availableWorkers = workers.filter((worker) => {
    const isOnboarded = worker.onboardingStatus === "ONBOARDED" || worker.onboardingStatus === "AGREEMENT_ACCEPTED";
    const notAlreadyAssigned = !assignedWorkerIds.has(worker.id);
    const matchesSearch = searchQuery
      ? worker.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        worker.email.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return isOnboarded && notAlreadyAssigned && matchesSearch;
  });

  const handleInvite = (worker: Worker) => {
    setSelectedWorker(worker);
    setShowConfirmModal(true);
    setFeedbackMessage(null);
  };

  const confirmAssign = () => {
    if (selectedWorker) {
      inviteMutation.mutate(selectedWorker.id);
    }
  };

  const renderWorker = ({ item }: { item: Worker }) => {
    const roles = item.workerRoles ? JSON.parse(item.workerRoles) : [];

    return (
      <Pressable onPress={() => handleInvite(item)} testID={`worker-card-${item.id}`}>
        <Card style={styles.workerCard}>
          <View style={styles.workerHeader}>
            <View style={styles.avatar}>
              <ThemedText style={styles.avatarText}>
                {item.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </ThemedText>
            </View>
            <View style={styles.workerInfo}>
              <ThemedText style={styles.workerName}>{item.fullName}</ThemedText>
              <ThemedText style={styles.workerEmail}>{item.email}</ThemedText>
              {roles.length > 0 ? (
                <ThemedText style={styles.rolesText}>
                  {roles.join(", ")}
                </ThemedText>
              ) : null}
            </View>
            <Feather name="plus-circle" size={24} color={theme.primary} />
          </View>
        </Card>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.searchContainer, { paddingTop: headerHeight + Spacing.sm }]}>
        <View style={[styles.searchBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <Feather name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            value={searchQuery}
            onChangeText={(text) => setSearchQuery(text.toUpperCase())}
            placeholder="SEARCH WORKERS..."
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="characters"
            testID="input-search-workers"
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery("")}>
              <Feather name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {feedbackMessage ? (
        <View style={[
          styles.feedbackBanner,
          { 
            backgroundColor: feedbackMessage.type === "success" ? "#DCFCE7" : "#FEE2E2",
            borderColor: feedbackMessage.type === "success" ? "#22C55E" : "#EF4444",
          }
        ]}>
          <Feather 
            name={feedbackMessage.type === "success" ? "check-circle" : "alert-circle"} 
            size={18} 
            color={feedbackMessage.type === "success" ? "#16A34A" : "#DC2626"} 
          />
          <ThemedText style={[
            styles.feedbackText,
            { color: feedbackMessage.type === "success" ? "#16A34A" : "#DC2626" }
          ]}>
            {feedbackMessage.text}
          </ThemedText>
          <Pressable onPress={() => setFeedbackMessage(null)}>
            <Feather name="x" size={18} color={feedbackMessage.type === "success" ? "#16A34A" : "#DC2626"} />
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={availableWorkers}
        keyExtractor={(item) => item.id}
        renderItem={renderWorker}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="user-check" size={48} color={theme.textSecondary} />
            <ThemedText style={styles.emptyText}>
              {searchQuery 
                ? "No matching workers found" 
                : "All onboarded workers are already assigned"}
            </ThemedText>
          </View>
        }
      />

      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <ThemedText style={styles.modalTitle}>Assign Worker</ThemedText>
            <ThemedText style={[styles.modalMessage, { color: theme.textSecondary }]}>
              Assign {selectedWorker?.fullName} to this workplace?
            </ThemedText>
            
            {inviteMutation.isPending ? (
              <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: Spacing.md }} />
            ) : null}

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton, { borderColor: theme.border }]}
                onPress={() => setShowConfirmModal(false)}
                disabled={inviteMutation.isPending}
              >
                <ThemedText style={{ color: theme.textSecondary }}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.assignButton, { backgroundColor: theme.primary }]}
                onPress={confirmAssign}
                disabled={inviteMutation.isPending}
              >
                <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
                  {inviteMutation.isPending ? "Assigning..." : "Assign"}
                </ThemedText>
              </Pressable>
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
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  feedbackText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  workerCard: {
    padding: Spacing.md,
  },
  workerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
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
  rolesText: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["2xl"],
  },
  emptyText: {
    fontSize: 15,
    opacity: 0.6,
    marginTop: Spacing.md,
    textAlign: "center",
    paddingHorizontal: Spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    width: "100%",
    maxWidth: 360,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  modalMessage: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1,
  },
  assignButton: {},
});
