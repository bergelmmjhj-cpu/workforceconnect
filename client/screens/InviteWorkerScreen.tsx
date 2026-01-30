import React, { useState } from "react";
import { View, StyleSheet, FlatList, Pressable, RefreshControl, TextInput, Alert } from "react-native";
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
import { getApiUrl } from "@/lib/query-client";

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

  const { data: workers = [], isLoading, refetch } = useQuery<Worker[]>({
    queryKey: ["/api/workers"],
    queryFn: async () => {
      const response = await fetch(new URL("/api/workers", getApiUrl()).toString(), {
        headers: {
          "x-user-id": user?.id || "",
          "x-user-role": user?.role || "",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch workers");
      return response.json();
    },
  });

  const { data: existingAssignments = [] } = useQuery<{ workerUserId: string }[]>({
    queryKey: ["/api/workplaces", workplaceId, "workers"],
    queryFn: async () => {
      const response = await fetch(new URL(`/api/workplaces/${workplaceId}/workers`, getApiUrl()).toString(), {
        headers: {
          "x-user-id": user?.id || "",
          "x-user-role": user?.role || "",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch assignments");
      return response.json();
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (workerId: string) => {
      const response = await fetch(new URL(`/api/workplaces/${workplaceId}/invite-worker`, getApiUrl()).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
          "x-user-role": user?.role || "",
        },
        body: JSON.stringify({ workerUserId: workerId, status: "active" }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to invite worker");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workplaces", workplaceId, "workers"] });
      Alert.alert("Success", "Worker has been assigned to this workplace");
      navigation.goBack();
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Failed to assign worker");
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
    Alert.alert(
      "Assign Worker",
      `Assign ${worker.fullName} to this workplace?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Assign", onPress: () => inviteMutation.mutate(worker.id) },
      ]
    );
  };

  const renderWorker = ({ item }: { item: Worker }) => {
    const roles = item.workerRoles ? JSON.parse(item.workerRoles) : [];

    return (
      <Pressable onPress={() => handleInvite(item)}>
        <Card style={styles.workerCard}>
          <View style={styles.workerHeader}>
            <View style={styles.avatar}>
              <ThemedText style={styles.avatarText}>
                {item.fullName.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </ThemedText>
            </View>
            <View style={styles.workerInfo}>
              <ThemedText style={styles.workerName}>{item.fullName}</ThemedText>
              <ThemedText style={styles.workerEmail}>{item.email}</ThemedText>
              {roles.length > 0 && (
                <ThemedText style={styles.rolesText}>
                  {roles.join(", ")}
                </ThemedText>
              )}
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
            onChangeText={setSearchQuery}
            placeholder="Search workers..."
            placeholderTextColor={theme.textSecondary}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Feather name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

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
});
