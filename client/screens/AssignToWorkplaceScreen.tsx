import React, { useState } from "react";
import { View, StyleSheet, FlatList, Pressable, RefreshControl, Modal } from "react-native";
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
import { apiRequest } from "@/lib/query-client";
import { getErrorMessage } from "@/utils/errorHandler";

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
  const [alertModal, setAlertModal] = useState<{title: string; message: string; onDismiss?: () => void} | null>(null);
  const [confirmModal, setConfirmModal] = useState<{title: string; message: string; onConfirm: () => void} | null>(null);

  const { data: workplaces = [], isLoading, refetch } = useQuery<Workplace[]>({
    queryKey: ["/api/workplaces"],
  });

  const inviteMutation = useMutation({
    mutationFn: async (workplaceIdToAssign: string) => {
      const res = await apiRequest("POST", `/api/workplaces/${workplaceIdToAssign}/invite-worker`, { workerUserId: workerId, status: "active" });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workplaces"] });
      setAlertModal({title: "Success", message: `${workerName} has been assigned to the workplace`, onDismiss: () => navigation.goBack()});
    },
    onError: (error: Error) => {
      setAlertModal({title: "Unable to Assign", message: getErrorMessage(error)});
    },
  });

  const handleAssign = (workplace: Workplace) => {
    setConfirmModal({
      title: "Assign Worker",
      message: `Assign ${workerName} to ${workplace.name}?`,
      onConfirm: () => inviteMutation.mutate(workplace.id),
    });
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
      <Modal visible={alertModal !== null} transparent animationType="fade" onRequestClose={() => { alertModal?.onDismiss?.(); setAlertModal(null); }}>
        <Pressable style={{flex:1, backgroundColor:"rgba(0,0,0,0.5)", justifyContent:"center", alignItems:"center", padding:24}} onPress={() => { alertModal?.onDismiss?.(); setAlertModal(null); }}>
          <Pressable style={{backgroundColor: theme.backgroundDefault, borderRadius:12, padding:24, width:"100%", maxWidth:340}} onPress={() => {}}>
            <ThemedText type="h4" style={{marginBottom:12}}>{alertModal?.title}</ThemedText>
            <ThemedText style={{color: theme.textSecondary, fontSize:14, lineHeight:20, marginBottom:24}}>{alertModal?.message}</ThemedText>
            <View style={{flexDirection:"row", gap:12}}>
              <Pressable style={{flex:1, backgroundColor: theme.primary, borderRadius:8, paddingVertical:12, alignItems:"center"}} onPress={() => { alertModal?.onDismiss?.(); setAlertModal(null); }}>
                <ThemedText style={{color:"#FFFFFF", fontWeight:"600", fontSize:15}}>OK</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal visible={confirmModal !== null} transparent animationType="fade" onRequestClose={() => setConfirmModal(null)}>
        <Pressable style={{flex:1, backgroundColor:"rgba(0,0,0,0.5)", justifyContent:"center", alignItems:"center", padding:24}} onPress={() => setConfirmModal(null)}>
          <Pressable style={{backgroundColor: theme.backgroundDefault, borderRadius:12, padding:24, width:"100%", maxWidth:340}} onPress={() => {}}>
            <ThemedText type="h4" style={{marginBottom:12}}>{confirmModal?.title}</ThemedText>
            <ThemedText style={{color: theme.textSecondary, fontSize:14, lineHeight:20, marginBottom:24}}>{confirmModal?.message}</ThemedText>
            <View style={{flexDirection:"row", gap:12}}>
              <Pressable style={{flex:1, backgroundColor: theme.backgroundSecondary, borderRadius:8, paddingVertical:12, alignItems:"center"}} onPress={() => setConfirmModal(null)}>
                <ThemedText style={{fontWeight:"600", fontSize:15}}>Cancel</ThemedText>
              </Pressable>
              <Pressable style={{flex:1, backgroundColor: theme.primary, borderRadius:8, paddingVertical:12, alignItems:"center"}} onPress={() => { confirmModal?.onConfirm(); setConfirmModal(null); }}>
                <ThemedText style={{color:"#FFFFFF", fontWeight:"600", fontSize:15}}>Assign</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
