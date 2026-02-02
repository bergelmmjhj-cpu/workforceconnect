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
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
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
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedUser, setSelectedUser] = useState<APIUser | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editRole, setEditRole] = useState<UserRole>("worker");
  const [editIsActive, setEditIsActive] = useState(true);
  
  // Create user state
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("worker");
  const [createError, setCreateError] = useState<string | null>(null);

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
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update user");
      }
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

  const createUserMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; fullName: string; role: UserRole }) => {
      const baseUrl = getApiUrl();
      const url = new URL("/api/users", baseUrl);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user?.role || "admin",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setCreateModalVisible(false);
      resetCreateForm();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error) => {
      setCreateError(error.message);
    },
  });

  const resetCreateForm = () => {
    setNewUserFullName("");
    setNewUserEmail("");
    setNewUserPassword("");
    setNewUserRole("worker");
    setCreateError(null);
  };

  const handleOpenCreateModal = () => {
    resetCreateForm();
    setCreateModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCreateUser = () => {
    setCreateError(null);
    
    if (!newUserFullName.trim()) {
      setCreateError("Full name is required");
      return;
    }
    if (!newUserEmail.trim()) {
      setCreateError("Email is required");
      return;
    }
    if (!newUserPassword.trim() || newUserPassword.length < 6) {
      setCreateError("Password must be at least 6 characters");
      return;
    }

    createUserMutation.mutate({
      email: newUserEmail.trim(),
      password: newUserPassword,
      fullName: newUserFullName.trim(),
      role: newUserRole,
    });
  };

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

  const handleDeleteUser = (userToDelete: APIUser) => {
    Alert.alert(
      "Delete User",
      `Are you sure you want to delete ${userToDelete.fullName}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteUserMutation.mutate(userToDelete.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
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
          <>
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
              <View style={[styles.statCard, { backgroundColor: theme.surface }]}>
                <ThemedText type="h2" style={{ color: theme.warning }}>
                  {users.filter((u) => u.isActive === false).length}
                </ThemedText>
                <ThemedText style={[styles.statLabel, { color: theme.textSecondary }]}>
                  Pending
                </ThemedText>
              </View>
            </View>
            {users.filter((u) => u.isActive === false).length > 0 ? (
              <View style={styles.pendingSection}>
                <View style={[styles.pendingHeader, { backgroundColor: theme.warning + "15" }]}>
                  <Feather name="clock" size={20} color={theme.warning} />
                  <ThemedText style={[styles.pendingTitle, { color: theme.warning }]}>
                    Pending Approval ({users.filter((u) => u.isActive === false).length})
                  </ThemedText>
                </View>
                {users.filter((u) => u.isActive === false).map((pendingUser) => (
                  <Card key={pendingUser.id} style={styles.pendingCard}>
                    <View style={styles.pendingUserRow}>
                      <View style={styles.pendingUserInfo}>
                        <ThemedText style={[styles.pendingUserName, { fontWeight: "600" }]}>
                          {pendingUser.fullName}
                        </ThemedText>
                        <ThemedText style={[styles.pendingUserEmail, { color: theme.textSecondary }]}>
                          {pendingUser.email}
                        </ThemedText>
                        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(pendingUser.role) + "15" }]}>
                          <ThemedText style={[styles.roleText, { color: getRoleColor(pendingUser.role) }]}>
                            {pendingUser.role.toUpperCase()}
                          </ThemedText>
                        </View>
                      </View>
                      <View style={styles.pendingActions}>
                        <Pressable
                          onPress={() => {
                            updateUserMutation.mutate({
                              id: pendingUser.id,
                              role: pendingUser.role as UserRole,
                              isActive: true,
                            });
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          }}
                          style={[styles.approveButton, { backgroundColor: theme.success }]}
                        >
                          <Feather name="check" size={18} color="#fff" />
                          <ThemedText style={styles.approveButtonText}>Approve</ThemedText>
                        </Pressable>
                        <Pressable
                          onPress={() => handleDeleteUser(pendingUser)}
                          style={[styles.rejectButton, { backgroundColor: theme.error + "15" }]}
                        >
                          <Feather name="x" size={18} color={theme.error} />
                        </Pressable>
                      </View>
                    </View>
                  </Card>
                ))}
                <View style={styles.sectionDivider}>
                  <ThemedText style={[styles.sectionDividerText, { color: theme.textSecondary }]}>
                    All Users
                  </ThemedText>
                </View>
              </View>
            ) : null}
          </>
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

      {/* Create User Modal */}
      <Modal
        visible={createModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <ThemedView style={[styles.modalContainer, { paddingTop: Spacing["2xl"] }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="h2">Create User</ThemedText>
            <Pressable onPress={() => setCreateModalVisible(false)}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            {createError ? (
              <View style={[styles.errorBanner, { backgroundColor: theme.error + "15" }]}>
                <Feather name="alert-circle" size={16} color={theme.error} />
                <ThemedText style={[styles.errorText, { color: theme.error }]}>
                  {createError}
                </ThemedText>
              </View>
            ) : null}

            <View style={styles.formSection}>
              <ThemedText style={[styles.formLabel, { color: theme.textSecondary }]}>
                Full Name
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={newUserFullName}
                onChangeText={setNewUserFullName}
                placeholder="Enter full name"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.formSection}>
              <ThemedText style={[styles.formLabel, { color: theme.textSecondary }]}>
                Email
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={newUserEmail}
                onChangeText={setNewUserEmail}
                placeholder="Enter email address"
                placeholderTextColor={theme.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.formSection}>
              <ThemedText style={[styles.formLabel, { color: theme.textSecondary }]}>
                Password
              </ThemedText>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={newUserPassword}
                onChangeText={setNewUserPassword}
                placeholder="Enter password (min 6 characters)"
                placeholderTextColor={theme.textMuted}
                secureTextEntry
                autoCapitalize="none"
              />
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
                      setNewUserRole(value);
                      Haptics.selectionAsync();
                    }}
                    style={[
                      styles.roleOption,
                      {
                        backgroundColor: newUserRole === value ? theme.primary + "15" : theme.surface,
                        borderColor: newUserRole === value ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Feather
                      name={getRoleIcon(value)}
                      size={20}
                      color={newUserRole === value ? theme.primary : theme.textSecondary}
                    />
                    <ThemedText
                      style={{
                        color: newUserRole === value ? theme.primary : theme.text,
                        fontWeight: newUserRole === value ? "600" : "400",
                      }}
                    >
                      {label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <Button
                onPress={handleCreateUser}
                disabled={createUserMutation.isPending}
                style={styles.saveButton}
              >
                {createUserMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  "Create User"
                )}
              </Button>
            </View>
          </ScrollView>
        </ThemedView>
      </Modal>

      {/* FAB Button */}
      <Pressable
        onPress={handleOpenCreateModal}
        style={[
          styles.fab,
          {
            backgroundColor: theme.primary,
            bottom: tabBarHeight + Spacing.lg,
          },
        ]}
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
  textInput: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 16,
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
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
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  pendingSection: {
    marginBottom: Spacing.lg,
  },
  pendingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  pendingCard: {
    marginBottom: Spacing.sm,
  },
  pendingUserRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pendingUserInfo: {
    flex: 1,
  },
  pendingUserName: {
    fontSize: 16,
  },
  pendingUserEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  pendingActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  approveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  approveButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionDivider: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionDividerText: {
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
