import React, { useState, useCallback } from "react";
import { View, StyleSheet, FlatList, Pressable, RefreshControl, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useQuery } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Avatar } from "@/components/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { rootNavigate } from "@/lib/navigation";

type Worker = {
  id: string;
  email: string;
  fullName: string;
  onboardingStatus: string | null;
  workerRoles: string | null;
  isActive: boolean;
  profilePhotoUrl: string | null;
  createdAt: string;
};

export default function WorkerDirectoryScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: workers = [], isLoading, refetch } = useQuery<Worker[]>({
    queryKey: ["/api/workers"],
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const filteredWorkers = workers.filter((worker) => {
    const query = searchQuery.toLowerCase();
    return (
      worker.fullName.toLowerCase().includes(query) ||
      worker.email.toLowerCase().includes(query)
    );
  });

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "ONBOARDED":
      case "AGREEMENT_ACCEPTED":
        return "#22c55e";
      case "APPLICATION_SUBMITTED":
      case "AGREEMENT_PENDING":
        return "#f59e0b";
      case "APPLICATION_REJECTED":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case "ONBOARDED":
      case "AGREEMENT_ACCEPTED":
        return "Active";
      case "APPLICATION_SUBMITTED":
        return "Pending Review";
      case "AGREEMENT_PENDING":
        return "Agreement Pending";
      case "APPLICATION_REJECTED":
        return "Rejected";
      case "NOT_APPLIED":
        return "Not Applied";
      default:
        return "Unknown";
    }
  };

  const renderWorker = ({ item }: { item: Worker }) => {
    const roles = item.workerRoles ? JSON.parse(item.workerRoles) : [];
    const isOnboarded = item.onboardingStatus === "ONBOARDED" || item.onboardingStatus === "AGREEMENT_ACCEPTED";

    return (
      <Card style={styles.workerCard}>
        <View style={styles.workerHeader}>
          <Avatar name={item.fullName} role="worker" size={44} imageUrl={item.profilePhotoUrl || undefined} />
          <View style={styles.workerInfo}>
            <ThemedText style={styles.workerName}>{item.fullName}</ThemedText>
            <ThemedText style={styles.workerEmail}>{item.email}</ThemedText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.onboardingStatus) + "20" }]}>
            <ThemedText style={[styles.statusText, { color: getStatusColor(item.onboardingStatus) }]}>
              {getStatusLabel(item.onboardingStatus)}
            </ThemedText>
          </View>
        </View>
        
        {roles.length > 0 && (
          <View style={styles.rolesContainer}>
            {roles.map((role: string, idx: number) => (
              <View key={idx} style={[styles.roleBadge, { backgroundColor: theme.primary + "15" }]}>
                <ThemedText style={[styles.roleText, { color: theme.primary }]}>{role}</ThemedText>
              </View>
            ))}
          </View>
        )}

        {isOnboarded && (
          <Pressable 
            style={[styles.assignButton, { borderColor: theme.primary }]}
            onPress={() => rootNavigate("AssignToWorkplace", { workerId: item.id, workerName: item.fullName })}
          >
            <Feather name="map-pin" size={16} color={theme.primary} />
            <ThemedText style={[styles.assignButtonText, { color: theme.primary }]}>
              Assign to Workplace
            </ThemedText>
          </Pressable>
        )}
      </Card>
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
        data={filteredWorkers}
        keyExtractor={(item) => item.id}
        renderItem={renderWorker}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="users" size={48} color={theme.textSecondary} />
            <ThemedText style={styles.emptyText}>
              {searchQuery ? "No workers found" : "No workers registered"}
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
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  rolesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "500",
  },
  assignButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  assignButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["2xl"],
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.6,
    marginTop: Spacing.md,
  },
});
