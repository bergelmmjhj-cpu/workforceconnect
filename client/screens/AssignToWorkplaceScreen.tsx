import React from "react";
import { View, StyleSheet, FlatList, Pressable, RefreshControl, Alert } from "react-native";
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
import { Spacing } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

type AssignToWorkplaceRouteProp = RouteProp<RootStackParamList, "AssignToWorkplace">;

type Workplace = {
  id: string;
  name: string;
  addressLine1: string | null;
  city: string | null;
  province: string | null;
  isActive: boolean;
};

export default function AssignToWorkplaceScreen() {
  const navigation = useNavigation();
  const route = useRoute<AssignToWorkplaceRouteProp>();
  const { workerId, workerName } = route.params;
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: workplaces = [], isLoading, refetch } = useQuery<Workplace[]>({
    queryKey: ["/api/workplaces"],
    queryFn: async () => {
      const response = await fetch(new URL("/api/workplaces", getApiUrl()).toString(), {
        headers: {
          "x-user-id": user?.id || "",
          "x-user-role": user?.role || "",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch workplaces");
      return response.json();
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (workplaceIdToAssign: string) => {
      const response = await fetch(new URL(`/api/workplaces/${workplaceIdToAssign}/invite-worker`, getApiUrl()).toString(), {
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
        throw new Error(data.error || "Failed to assign worker");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workplaces"] });
      Alert.alert("Success", `${workerName} has been assigned to the workplace`);
      navigation.goBack();
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Failed to assign worker");
    },
  });

  const handleAssign = (workplace: Workplace) => {
    Alert.alert(
      "Assign Worker",
      `Assign ${workerName} to ${workplace.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Assign", onPress: () => inviteMutation.mutate(workplace.id) },
      ]
    );
  };

  const activeWorkplaces = workplaces.filter(w => w.isActive);

  const renderWorkplace = ({ item }: { item: Workplace }) => (
    <Pressable onPress={() => handleAssign(item)}>
      <Card style={styles.workplaceCard}>
        <View style={styles.workplaceHeader}>
          <View style={[styles.iconContainer, { backgroundColor: theme.primary + "20" }]}>
            <Feather name="map-pin" size={20} color={theme.primary} />
          </View>
          <View style={styles.workplaceInfo}>
            <ThemedText style={styles.workplaceName}>{item.name}</ThemedText>
            <ThemedText style={styles.workplaceAddress}>
              {[item.city, item.province].filter(Boolean).join(", ") || "No location set"}
            </ThemedText>
          </View>
          <Feather name="plus-circle" size={24} color={theme.primary} />
        </View>
      </Card>
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.headerInfo, { paddingTop: headerHeight + Spacing.md }]}>
        <ThemedText style={styles.headerText}>
          Select a workplace to assign {workerName}:
        </ThemedText>
      </View>

      <FlatList
        data={activeWorkplaces}
        keyExtractor={(item) => item.id}
        renderItem={renderWorkplace}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="map-pin" size={48} color={theme.textSecondary} />
            <ThemedText style={styles.emptyText}>No active workplaces</ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Create a workplace first to assign workers
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
  headerInfo: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerText: {
    fontSize: 15,
    opacity: 0.7,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  workplaceCard: {
    padding: Spacing.md,
  },
  workplaceHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  workplaceInfo: {
    flex: 1,
  },
  workplaceName: {
    fontSize: 16,
    fontWeight: "600",
  },
  workplaceAddress: {
    fontSize: 13,
    opacity: 0.6,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["2xl"],
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: Spacing.xs,
  },
});
