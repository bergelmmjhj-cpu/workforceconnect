import React, { useState, useCallback } from "react";
import { View, StyleSheet, FlatList, Pressable, RefreshControl, Modal, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { rootNavigate } from "@/lib/navigation";
import { apiRequest } from "@/lib/query-client";

type Workplace = {
  id: string;
  name: string;
  addressLine1: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  geofenceRadiusMeters: number;
  isActive: boolean;
  createdAt: string;
};

export default function WorkplacesListScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [confirmModal, setConfirmModal] = useState<{title: string; message: string; onConfirm: () => void} | null>(null);

  const { data: workplaces = [], isLoading, refetch } = useQuery<Workplace[]>({
    queryKey: ["/api/workplaces"],
  });

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const toggleMutation = useMutation({
    mutationFn: async (workplaceId: string) => {
      const res = await apiRequest("PATCH", `/api/workplaces/${workplaceId}/toggle-active`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workplaces"] });
    },
  });

  const handleToggleActive = (workplace: Workplace) => {
    if (Platform.OS === "web") {
      if (window.confirm(`${workplace.isActive ? "Deactivate" : "Activate"} ${workplace.name}?`)) {
        toggleMutation.mutate(workplace.id);
      }
    } else {
      setConfirmModal({
        title: workplace.isActive ? "Deactivate Workplace" : "Activate Workplace",
        message: `Are you sure you want to ${workplace.isActive ? "deactivate" : "activate"} ${workplace.name}?`,
        onConfirm: () => toggleMutation.mutate(workplace.id),
      });
    }
  };

  const renderWorkplace = ({ item }: { item: Workplace }) => (
    <Card 
      style={styles.workplaceCard}
      onPress={() => rootNavigate("WorkplaceDetail", { workplaceId: item.id })}
    >
      <View style={styles.workplaceHeader}>
        <View style={[styles.statusDot, { backgroundColor: item.isActive ? "#22c55e" : "#ef4444" }]} />
        <ThemedText style={styles.workplaceName} numberOfLines={1}>{item.name}</ThemedText>
        <Pressable 
          onPress={(e) => {
            e.stopPropagation();
            handleToggleActive(item);
          }} 
          hitSlop={8}
        >
          <Feather name={item.isActive ? "toggle-right" : "toggle-left"} size={24} color={item.isActive ? "#22c55e" : theme.textSecondary} />
        </Pressable>
      </View>
      <ThemedText style={styles.workplaceAddress} numberOfLines={2}>
        {[item.addressLine1, item.city, item.province, item.postalCode].filter(Boolean).join(", ") || "No address set"}
      </ThemedText>
      <View style={styles.workplaceFooter}>
        <View style={styles.footerItem}>
          <Feather name="map-pin" size={14} color={theme.textSecondary} />
          <ThemedText style={styles.footerText}>
            {item.latitude && item.longitude ? `${item.geofenceRadiusMeters}m radius` : "GPS not set"}
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={18} color={theme.textSecondary} />
      </View>
    </Card>
  );

  return (
    <ThemedView style={styles.container}>
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
                <ThemedText style={{color:"#FFFFFF", fontWeight:"600", fontSize:15}}>Confirm</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <FlatList
        data={workplaces}
        keyExtractor={(item) => item.id}
        renderItem={renderWorkplace}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: Platform.OS === "web" ? Spacing.md : headerHeight + Spacing.md, paddingBottom: insets.bottom + 80 },
        ]}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="map-pin" size={48} color={theme.textSecondary} />
            <ThemedText style={styles.emptyText}>No workplaces yet</ThemedText>
            <ThemedText style={styles.emptySubtext}>Add your first workplace location</ThemedText>
          </View>
        }
      />
      <Pressable
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => rootNavigate("WorkplaceEdit", { workplaceId: undefined })}
      >
        <Feather name="plus" size={24} color="#fff" />
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  workplaceCard: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  workplaceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  workplaceName: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
  },
  workplaceAddress: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: Spacing.sm,
  },
  workplaceFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: 13,
    opacity: 0.6,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["2xl"],
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: Spacing.xs,
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
