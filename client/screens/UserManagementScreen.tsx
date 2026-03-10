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
} from "react-native";
import * as Clipboard from "expo-clipboard";
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
import { Spacing, BorderRadius, Layout } from "@/constants/theme";
import { useIsWideWeb } from "@/components/WebSidebarLayout";
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
  phone: string | null;
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
  const isWideWeb = useIsWideWeb();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [selectedUser, setSelectedUser] = useState<APIUser | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editRole, setEditRole] = useState<UserRole>("worker");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPhone, setEditPhone] = useState("");
  
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("worker");
  const [createError, setCreateError] = useState<string | null>(null);

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [userToDelete, setUserToDelete] = useState<APIUser | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteFullName, setInviteFullName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"hr" | "client">("hr");
  const [inviteBusinessName, setInviteBusinessName] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteCredentials, setInviteCredentials] = useState<{ email: string; tempPassword: string } | null>(null);
  const [copiedField, setCopiedField] = useState<"email" | "password" | null>(null);

  const { data: users = [], isLoading, refetch, isRefetching } = useQuery<APIUser[]>({
    queryKey: ["/api/users"],
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, role, isActive, phone }: { id: string; role: UserRole; isActive: boolean; phone?: string }) => {
      const res = await apiRequest("PATCH", `/api/users/${id}`, { role, isActive, phone: phone?.trim() || null });
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
      const res = await apiRequest("DELETE", `/api/users/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setDeleteModalVisible(false);
      setUserToDelete(null);
      setDeleteError(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error) => {
      setDeleteError(error.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; fullName: string; role: UserRole }) => {
      const res = await apiRequest("POST", "/api/users", data);
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

  const inviteUserMutation = useMutation({
    mutationFn: async (data: { fullName: string; email: string; role: "hr" | "client"; businessName?: string }) => {
      const res = await apiRequest("POST", "/api/admin/invite-user", data);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to invite user");
      return json;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setInviteCredentials({ email: data.email, tempPassword: data.tempPassword });
      setInviteFullName("");
      setInviteEmail("");
      setInviteRole("hr");
      setInviteBusinessName("");
      setInviteError(null);
      setCopiedField(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error) => {
      const match = error.message.match(/^\d+: (\{.*\})$/s);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          setInviteError(parsed.error || error.message);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        } catch {}
      }
      setInviteError(error.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handleInviteUser = () => {
    setInviteError(null);
    setInviteCredentials(null);
    if (!inviteFullName.trim()) { setInviteError("Full name is required"); return; }
    if (!inviteEmail.trim()) { setInviteError("Email is required"); return; }
    if (inviteRole === "client" && !inviteBusinessName.trim()) { setInviteError("Business name is required for clients"); return; }
    inviteUserMutation.mutate({
      fullName: inviteFullName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
      businessName: inviteRole === "client" ? inviteBusinessName.trim() : undefined,
    });
  };

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
    setEditPhone(userToEdit.phone || "");
    setEditModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveUser = () => {
    if (selectedUser) {
      updateUserMutation.mutate({
        id: selectedUser.id,
        role: editRole,
        isActive: editIsActive,
        phone: editPhone,
      });
    }
  };

  const handleDeleteUser = (targetUser: APIUser) => {
    setUserToDelete(targetUser);
    setDeleteError(null);
    setDeleteModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
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
          {item.phone ? (
            <ThemedText style={[styles.userPhone, { color: theme.textSecondary }]}>
              {item.phone}
            </ThemedText>
          ) : null}
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
          isWideWeb && { maxWidth: Layout.listMaxWidth, alignSelf: 'center', width: '100%' },
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

      {/* Edit User Modal */}
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
                    Phone Number
                  </ThemedText>
                  <TextInput
                    testID="input-edit-phone"
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder="e.g. +1 (416) 555-0123"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    style={[
                      styles.phoneInput,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                        color: theme.text,
                      },
                    ]}
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
                  <Pressable
                    onPress={() => {
                      setEditModalVisible(false);
                      setTimeout(() => handleDeleteUser(selectedUser), 300);
                    }}
                    style={[styles.deleteButton, { backgroundColor: theme.error + "15" }]}
                  >
                    <Feather name="trash-2" size={18} color={theme.error} />
                    <ThemedText style={[styles.deleteButtonText, { color: theme.error }]}>
                      Delete User
                    </ThemedText>
                  </Pressable>
                </View>
              </>
            ) : null}
          </ScrollView>
        </ThemedView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          if (!deleteUserMutation.isPending) {
            setDeleteModalVisible(false);
            setUserToDelete(null);
            setDeleteError(null);
          }
        }}
      >
        <View style={styles.deleteOverlay}>
          <ThemedView style={[styles.deleteModal, { borderColor: theme.border }]}>
            <View style={[styles.deleteIconContainer, { backgroundColor: theme.error + "15" }]}>
              <Feather name="alert-triangle" size={32} color={theme.error} />
            </View>
            <ThemedText style={[styles.deleteModalTitle, { fontWeight: "700" }]}>
              Delete User
            </ThemedText>
            <ThemedText style={[styles.deleteModalMessage, { color: theme.textSecondary }]}>
              Are you sure you want to permanently delete{" "}
              <ThemedText style={{ fontWeight: "600" }}>
                {userToDelete?.fullName}
              </ThemedText>
              ? This action cannot be undone.
            </ThemedText>

            {deleteError ? (
              <View style={[styles.errorBanner, { backgroundColor: theme.error + "15" }]}>
                <Feather name="alert-circle" size={16} color={theme.error} />
                <ThemedText style={[styles.errorText, { color: theme.error }]}>
                  {deleteError}
                </ThemedText>
              </View>
            ) : null}

            <View style={styles.deleteModalActions}>
              <Pressable
                onPress={() => {
                  setDeleteModalVisible(false);
                  setUserToDelete(null);
                  setDeleteError(null);
                }}
                disabled={deleteUserMutation.isPending}
                style={[styles.cancelButton, { borderColor: theme.border }]}
              >
                <ThemedText style={{ fontWeight: "600" }}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={confirmDelete}
                disabled={deleteUserMutation.isPending}
                style={[styles.confirmDeleteButton, { backgroundColor: theme.error }]}
              >
                {deleteUserMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <ThemedText style={[styles.confirmDeleteText, { color: "#fff" }]}>
                    Delete
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </ThemedView>
        </View>
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

      {/* FAB Buttons */}
      <View style={[styles.fabRow, { bottom: insets.bottom + Spacing.lg }]}>
        <Pressable
          onPress={() => {
            setInviteFullName(""); setInviteEmail(""); setInviteRole("hr");
            setInviteBusinessName(""); setInviteError(null); setInviteCredentials(null); setCopiedField(null);
            setInviteModalVisible(true);
          }}
          style={[styles.fabSecondary, { backgroundColor: theme.surface, borderColor: theme.primary }]}
        >
          <Feather name="user-plus" size={18} color={theme.primary} />
          <ThemedText style={[styles.fabSecondaryText, { color: theme.primary }]}>Invite HR/Client</ThemedText>
        </Pressable>
        <Pressable
          onPress={handleOpenCreateModal}
          style={[styles.fab, { backgroundColor: theme.primary }]}
        >
          <Feather name="plus" size={24} color="#fff" />
        </Pressable>
      </View>

      {/* Invite HR/Client Modal */}
      <Modal
        visible={inviteModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          if (!inviteCredentials) setInviteModalVisible(false);
        }}
      >
        <ThemedView style={[styles.modalContainer, { paddingTop: Spacing["2xl"] }]}>
          <View style={styles.modalHeader}>
            <ThemedText type="h2">
              {inviteCredentials ? "Account Created" : "Invite HR / Client"}
            </ThemedText>
            {inviteCredentials ? null : (
              <Pressable onPress={() => setInviteModalVisible(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            )}
          </View>

          {inviteCredentials ? (
            <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: Spacing["2xl"] }}>
              <View style={[styles.credentialSuccessBanner, { backgroundColor: theme.success + "15" }]}>
                <Feather name="check-circle" size={20} color={theme.success} />
                <ThemedText style={[styles.credentialSuccessText, { color: theme.success }]}>
                  Account is ready. Share these login details with the user.
                </ThemedText>
              </View>

              <ThemedText style={[styles.credentialNote, { color: theme.textSecondary }]}>
                The user will be asked to change their password on first login.
              </ThemedText>

              <View style={[styles.credentialCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.credentialRow}>
                  <View style={styles.credentialLabelCol}>
                    <Feather name="mail" size={16} color={theme.textMuted} />
                    <ThemedText style={[styles.credentialLabel, { color: theme.textSecondary }]}>Email</ThemedText>
                  </View>
                  <ThemedText style={[styles.credentialValue, { color: theme.text }]} numberOfLines={1} selectable>
                    {inviteCredentials.email}
                  </ThemedText>
                  <Pressable
                    onPress={async () => {
                      await Clipboard.setStringAsync(inviteCredentials.email);
                      setCopiedField("email");
                      setTimeout(() => setCopiedField(null), 2000);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[styles.copyButton, { backgroundColor: copiedField === "email" ? theme.success + "20" : theme.backgroundSecondary }]}
                  >
                    <Feather name={copiedField === "email" ? "check" : "copy"} size={16} color={copiedField === "email" ? theme.success : theme.primary} />
                  </Pressable>
                </View>

                <View style={[styles.credentialDivider, { backgroundColor: theme.border }]} />

                <View style={styles.credentialRow}>
                  <View style={styles.credentialLabelCol}>
                    <Feather name="lock" size={16} color={theme.textMuted} />
                    <ThemedText style={[styles.credentialLabel, { color: theme.textSecondary }]}>Password</ThemedText>
                  </View>
                  <ThemedText style={[styles.credentialValue, { color: theme.text }]} selectable>
                    {inviteCredentials.tempPassword}
                  </ThemedText>
                  <Pressable
                    onPress={async () => {
                      await Clipboard.setStringAsync(inviteCredentials.tempPassword);
                      setCopiedField("password");
                      setTimeout(() => setCopiedField(null), 2000);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[styles.copyButton, { backgroundColor: copiedField === "password" ? theme.success + "20" : theme.backgroundSecondary }]}
                  >
                    <Feather name={copiedField === "password" ? "check" : "copy"} size={16} color={copiedField === "password" ? theme.success : theme.primary} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.modalActions}>
                <Button
                  onPress={() => {
                    setInviteCredentials(null);
                    setCopiedField(null);
                    setInviteModalVisible(false);
                  }}
                >
                  Done
                </Button>
              </View>
            </ScrollView>
          ) : (
            <ScrollView style={styles.modalContent}>
              {inviteError ? (
                <View style={[styles.modalError, { backgroundColor: theme.error + "15" }]}>
                  <Feather name="alert-circle" size={14} color={theme.error} />
                  <ThemedText style={[styles.modalErrorText, { color: theme.error }]}>{inviteError}</ThemedText>
                </View>
              ) : null}

              <ThemedText style={styles.inputLabel}>Full Name</ThemedText>
              <TextInput
                style={[styles.textInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }]}
                value={inviteFullName}
                onChangeText={setInviteFullName}
                placeholder="Full name"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="words"
              />

              <ThemedText style={styles.inputLabel}>Email</ThemedText>
              <TextInput
                style={[styles.textInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }]}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="email@example.com"
                placeholderTextColor={theme.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <ThemedText style={styles.inputLabel}>Role</ThemedText>
              <View style={styles.roleToggleRow}>
                {(["hr", "client"] as const).map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => setInviteRole(r)}
                    style={[
                      styles.roleChipModal,
                      { borderColor: theme.border, backgroundColor: inviteRole === r ? theme.primary : theme.surface },
                    ]}
                  >
                    <ThemedText style={[styles.roleChipTextModal, { color: inviteRole === r ? "#fff" : theme.text }]}>
                      {r === "hr" ? "HR" : "Client"}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              {inviteRole === "client" ? (
                <>
                  <ThemedText style={styles.inputLabel}>Business Name</ThemedText>
                  <TextInput
                    style={[styles.textInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }]}
                    value={inviteBusinessName}
                    onChangeText={setInviteBusinessName}
                    placeholder="Company name"
                    placeholderTextColor={theme.textMuted}
                    autoCapitalize="words"
                  />
                </>
              ) : null}

              <ThemedText style={[styles.inputLabel, { color: theme.textMuted, fontSize: 12 }]}>
                A temporary password will be generated. You will be shown the credentials to share with the user.
              </ThemedText>

              <View style={styles.modalActions}>
                <Button
                  onPress={handleInviteUser}
                  disabled={inviteUserMutation.isPending}
                >
                  {inviteUserMutation.isPending ? "Creating..." : "Create Account"}
                </Button>
              </View>
            </ScrollView>
          )}
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
  textInput: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 16,
  },
  fabRow: {
    position: "absolute",
    right: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  fabSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: 28,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  fabSecondaryText: {
    fontSize: 13,
    fontWeight: "600",
  },
  fab: {
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
  inputLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  roleToggleRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  roleChipModal: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  roleChipTextModal: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalError: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  modalErrorText: {
    fontSize: 13,
    flex: 1,
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
  userPhone: {
    fontSize: 13,
    marginTop: 1,
  },
  phoneInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 16,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  deleteButtonText: {
    fontWeight: "600",
    fontSize: 15,
  },
  deleteOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  deleteModal: {
    width: "100%",
    maxWidth: 360,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: "center",
    borderWidth: 1,
  },
  deleteIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  deleteModalTitle: {
    fontSize: 20,
    marginBottom: Spacing.sm,
  },
  deleteModalMessage: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  deleteModalActions: {
    flexDirection: "row",
    gap: Spacing.md,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  confirmDeleteButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmDeleteText: {
    fontWeight: "700",
    fontSize: 15,
  },
  credentialSuccessBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  credentialSuccessText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  credentialNote: {
    fontSize: 13,
    marginBottom: Spacing.lg,
    lineHeight: 18,
  },
  credentialCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: Spacing.xl,
  },
  credentialRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  credentialLabelCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    width: 80,
  },
  credentialLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  credentialValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  copyButton: {
    width: 34,
    height: 34,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  credentialDivider: {
    height: 1,
    marginHorizontal: Spacing.md,
  },
});
