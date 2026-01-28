import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { UserRole } from "@/types";

interface APIUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  timezone: string | null;
  onboardingStatus: string | null;
  workerRoles: string | null;
  businessName: string | null;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string;
}

const ROLES: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "hr", label: "HR" },
  { value: "client", label: "Client" },
  { value: "worker", label: "Worker" },
];

export default function UserManagementScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedUser, setSelectedUser] = useState<APIUser | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editRole, setEditRole] = useState<UserRole>("worker");
  const [editIsActive, setEditIsActive] = useState(true);

  const { data: users = [], isLoading, refetch, isRefetching } = useQuery<APIUser[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const baseUrl = getApiUrl();
      const url = new URL("/api/users", baseUrl);
      const res = await fetch(url, {
        headers: { "x-user-role": user?.role || "admin" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, role, isActive }: { id: string; role: UserRole; isActive: boolean }) => {
      const baseUrl = getApiUrl();
      const url = new URL(`/api/users/${id}`, baseUrl);
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user?.role || "admin",
        },
        body: JSON.stringify({ role, isActive }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditModalVisible(false);
      setSelectedUser(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const baseUrl = getApiUrl();
      const url = new URL(`/api/users/${id}`, baseUrl);
      const res = await fetch(url, {
        method: "DELETE",
        headers: { "x-user-role": user?.role || "admin" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const handleEditUser = (userToEdit: APIUser) => {
    setSelectedUser(userToEdit);
    setEditRole(userToEdit.role as UserRole);
    setEditIsActive(userToEdit.isActive !== false);
    setEditModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveUser = () => {
    if (selectedUser) {
      updateUserMutation.mutate({
        id: selectedUser.id,
        role: editRole,
        isActive: editIsActive,
      });
    }
  };

  const getRoleIcon = (role: string): keyof typeof Feather.glyphMap => {
    switch (role) {
      case "admin": return "settings";
      case "hr": return "users";
      case "client": return "briefcase";
      case "worker": return "user";
      default: return "user";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin": return theme.error;
      case "hr": return theme.primary;
      case "client": return theme.success;
      case "worker": return theme.warning;
      default: return theme.textSecondary;
    }
  };

  const renderUserItem = ({ item }: { item: APIUser }) => (
    <Card style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={[styles.avatarContainer, { backgroundColor: getRoleColor(item.role) + "20" }]}>
          <Feather name={getRoleIcon(item.role)} size={24} color={getRoleColor(item.role)} />
        </View>
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <ThemedText style={[styles.userName, { fontWeight: "600" }]}>
              {item.fullName}
            </ThemedText>
            {item.isActive === false ? (
              <View style={[styles.statusBadge, { backgroundColor: theme.error + "20" }]}>
                <ThemedText style={[styles.statusText, { color: theme.error }]}>
                  Inactive
                </ThemedText>
              </View>
            ) : null}
          </View>
          <ThemedText style={[styles.userEmail, { color: theme.textSecondary }]}>
            {item.email}
          </ThemedText>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) + "15" }]}>
            <ThemedText style={[styles.roleText, { color: getRoleColor(item.role) }]}>
              {item.role.toUpperCase()}
            </ThemedText>
          </View>
        </View>
        <Pressable
          onPress={() => handleEditUser(item)}
          style={[styles.editButton, { backgroundColor: theme.surface }]}
        >
          <Feather name="edit-2" size={18} color={theme.primary} />
        </Pressable>
      </View>
      {item.onboardingStatus ? (
        <View style={[styles.onboardingStatus, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="info" size={14} color={theme.textMuted} />
          <ThemedText style={[styles.onboardingText, { color: theme.textMuted }]}>
            Onboarding: {item.onboardingStatus.replace(/_/g, " ")}
          </ThemedText>
        </View>
      ) : null}
    </Card>
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUserItem}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.md,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="users" size={48} color={theme.textMuted} />
            <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>
              No users found
            </ThemedText>
          </View>
        }
        ListHeaderComponent={
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
              <ThemedText type="h2" style={{ color: theme.primary }}>
                {users.length}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                Total Users
              </ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
              <ThemedText type="h2" style={{ color: theme.success }}>
                {users.filter((u) => u.isActive !== false).length}
              </ThemedText>
              <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                Active
              </ThemedText>
            </View>
          </View>
        }
      />

      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <ThemedView style={[styles.modalContainer, { paddingTop: Spacing["2xl"] }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="h2">Edit User</ThemedText>
            <Pressable onPress={() => setEditModalVisible(false)}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent}>
            {selectedUser ? (
              <>
                <View style={styles.modalUserInfo}>
                  <ThemedText style={[styles.modalUserName, { fontWeight: "600" }]}>
                    {selectedUser.fullName}
                  </ThemedText>
                  <ThemedText style={[styles.modalUserEmail, { color: theme.textSecondary }]}>
                    {selectedUser.email}
                  </ThemedText>
                </View>

                <View style={styles.formSection}>
                  <ThemedText style={[styles.formLabel, { color: theme.textSecondary }]}>
                    Role
                  </ThemedText>
                  <View style={styles.roleOptions}>
                    {ROLES.map(({ value, label }) => (
                      <Pressable
                        key={value}
                        onPress={() => {
                          setEditRole(value);
                          Haptics.selectionAsync();
                        }}
                        style={[
                          styles.roleOption,
                          {
                            backgroundColor: editRole === value ? theme.primary + "15" : theme.surface,
                            borderColor: editRole === value ? theme.primary : theme.border,
                          },
                        ]}
                      >
                        <Feather
                          name={getRoleIcon(value)}
                          size={20}
                          color={editRole === value ? theme.primary : theme.textSecondary}
                        />
                        <ThemedText
                          style={{
                            color: editRole === value ? theme.primary : theme.text,
                            fontWeight: editRole === value ? "600" : "400",
                          }}
                        >
                          {label}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.formSection}>
                  <ThemedText style={[styles.formLabel, { color: theme.textSecondary }]}>
                    Status
                  </ThemedText>
                  <View style={styles.statusOptions}>
                    <Pressable
                      onPress={() => {
                        setEditIsActive(true);
                        Haptics.selectionAsync();
                      }}
                      style={[
                        styles.statusOption,
                        {
                          backgroundColor: editIsActive ? theme.success + "15" : theme.surface,
                          borderColor: editIsActive ? theme.success : theme.border,
                        },
                      ]}
                    >
                      <Feather
                        name="check-circle"
                        size={20}
                        color={editIsActive ? theme.success : theme.textSecondary}
                      />
                      <ThemedText
                        style={{
                          color: editIsActive ? theme.success : theme.text,
                          fontWeight: editIsActive ? "600" : "400",
                        }}
                      >
                        Active
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setEditIsActive(false);
                        Haptics.selectionAsync();
                      }}
                      style={[
                        styles.statusOption,
                        {
                          backgroundColor: !editIsActive ? theme.error + "15" : theme.surface,
                          borderColor: !editIsActive ? theme.error : theme.border,
                        },
                      ]}
                    >
                      <Feather
                        name="x-circle"
                        size={20}
                        color={!editIsActive ? theme.error : theme.textSecondary}
                      />
                      <ThemedText
                        style={{
                          color: !editIsActive ? theme.error : theme.text,
                          fontWeight: !editIsActive ? "600" : "400",
                        }}
                      >
                        Inactive
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <Button
                    onPress={handleSaveUser}
                    disabled={updateUserMutation.isPending}
                    style={styles.saveButton}
                  >
                    {updateUserMutation.isPending ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                </View>
              </>
            ) : null}
          </ScrollView>
        </ThemedView>
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
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 13,
    marginTop: Spacing.xs,
  },
  userCard: {
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  userName: {
    fontSize: 16,
  },
  userEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  onboardingStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  onboardingText: {
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
  },
  emptyText: {
    marginTop: Spacing.md,
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: Spacing.lg,
  },
  modalContent: {
    flex: 1,
  },
  modalUserInfo: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  modalUserName: {
    fontSize: 20,
  },
  modalUserEmail: {
    fontSize: 15,
    marginTop: Spacing.xs,
  },
  formSection: {
    marginBottom: Spacing.xl,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: Spacing.md,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  roleOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  roleOption: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  statusOptions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statusOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  modalActions: {
    marginTop: Spacing.xl,
  },
  saveButton: {
    marginBottom: Spacing.xl,
  },
});
