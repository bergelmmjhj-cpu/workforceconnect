import React, { useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  TextInput,
  Modal,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useContentPadding } from "@/hooks/useContentPadding";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { formatRelativeTime } from "@/utils/format";

type Worker = {
  id: string;
  email: string;
  fullName: string;
  onboardingStatus: string | null;
  workerRoles: string | null;
  isActive: boolean;
};

type Conversation = {
  id: string;
  type: string;
  workerUserId: string;
  hrUserId: string | null;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  workerName: string | null;
  workerEmail: string | null;
  unreadCount: number;
};

export default function WorkerCommunicationsScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { paddingTop } = useContentPadding();
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showNewMessage, setShowNewMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: conversations, isLoading: loadingConversations, refetch } = useQuery<Conversation[]>({
    queryKey: ["/api/communications/conversations"],
    queryFn: async () => {
      const res = await fetch(`${getApiUrl()}api/communications/conversations`, {
        headers: {
          "x-user-role": user?.role || "hr",
          "x-user-id": user?.id || "",
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
    enabled: !!user && (user.role === "admin" || user.role === "hr"),
    refetchInterval: 5000,
  });

  const { data: workers, isLoading: loadingWorkers } = useQuery<Worker[]>({
    queryKey: ["/api/communications/workers"],
    queryFn: async () => {
      const res = await fetch(`${getApiUrl()}api/communications/workers`, {
        headers: {
          "x-user-role": user?.role || "hr",
          "x-user-id": user?.id || "",
        },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch workers");
      return res.json();
    },
    enabled: !!user && (user.role === "admin" || user.role === "hr") && showNewMessage,
  });

  const createConversationMutation = useMutation({
    mutationFn: async (workerUserId: string) => {
      const res = await fetch(`${getApiUrl()}api/communications/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user?.role || "hr",
          "x-user-id": user?.id || "",
        },
        credentials: "include",
        body: JSON.stringify({ workerUserId }),
      });
      if (!res.ok) throw new Error("Failed to create conversation");
      return res.json();
    },
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/communications/conversations"] });
      setShowNewMessage(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.navigate("CommunicationsChat", { conversationId: conversation.id });
    },
  });

  const handleConversationPress = (conv: Conversation) => {
    Haptics.selectionAsync();
    navigation.navigate("CommunicationsChat", { conversationId: conv.id });
  };

  const handleStartNewConversation = (worker: Worker) => {
    const existingConvo = conversations?.find((c) => c.workerUserId === worker.id);
    if (existingConvo) {
      setShowNewMessage(false);
      navigation.navigate("CommunicationsChat", { conversationId: existingConvo.id });
    } else {
      createConversationMutation.mutate(worker.id);
    }
  };

  const filteredConversations = conversations?.filter((c) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      c.workerName?.toLowerCase().includes(search) ||
      c.workerEmail?.toLowerCase().includes(search) ||
      c.lastMessagePreview?.toLowerCase().includes(search)
    );
  });

  const filteredWorkers = workers?.filter((w) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      w.fullName.toLowerCase().includes(search) ||
      w.email.toLowerCase().includes(search)
    );
  });

  const renderConversation = ({ item }: { item: Conversation }) => (
    <Pressable onPress={() => handleConversationPress(item)} testID={`conversation-${item.id}`}>
      <Card style={styles.conversationCard}>
        <View style={styles.conversationRow}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.avatarText}>
              {item.workerName?.charAt(0).toUpperCase() || "?"}
            </ThemedText>
          </View>
          <View style={styles.conversationContent}>
            <View style={styles.conversationHeader}>
              <ThemedText style={styles.workerName} numberOfLines={1}>
                {item.workerName || "Unknown Worker"}
              </ThemedText>
              {item.lastMessageAt ? (
                <ThemedText style={[styles.time, { color: theme.textSecondary }]}>
                  {formatRelativeTime(item.lastMessageAt)}
                </ThemedText>
              ) : null}
            </View>
            <View style={styles.previewRow}>
              <ThemedText
                style={[styles.preview, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {item.lastMessagePreview || "No messages yet"}
              </ThemedText>
              {item.unreadCount > 0 ? (
                <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                  <ThemedText style={styles.badgeText}>{item.unreadCount}</ThemedText>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );

  const renderWorker = ({ item }: { item: Worker }) => (
    <Pressable onPress={() => handleStartNewConversation(item)} testID={`worker-${item.id}`}>
      <Card style={styles.conversationCard}>
        <View style={styles.conversationRow}>
          <View style={[styles.avatar, { backgroundColor: theme.primaryLight }]}>
            <ThemedText style={styles.avatarText}>
              {item.fullName.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
          <View style={styles.conversationContent}>
            <ThemedText style={styles.workerName}>{item.fullName}</ThemedText>
            <ThemedText style={[styles.preview, { color: theme.textSecondary }]}>
              {item.email}
            </ThemedText>
          </View>
          <Feather name="message-circle" size={20} color={theme.primary} />
        </View>
      </Card>
    </Pressable>
  );

  const EmptyConversations = () => (
    <View style={styles.emptyContainer}>
      <Feather name="message-circle" size={48} color={theme.textMuted} />
      <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>No Conversations</ThemedText>
      <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
        Start a new conversation with a worker by tapping the + button.
      </ThemedText>
    </View>
  );

  const EmptyWorkers = () => (
    <View style={styles.emptyContainer}>
      <Feather name="users" size={48} color={theme.textMuted} />
      <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>No Workers Found</ThemedText>
      <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
        No workers match your search.
      </ThemedText>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop }]}>
        <View style={styles.headerRow}>
          <ThemedText style={styles.title}>Worker Communications</ThemedText>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowNewMessage(true);
            }}
            style={[styles.newButton, { backgroundColor: theme.primary }]}
            testID="new-message-button"
          >
            <Feather name="plus" size={20} color="#fff" />
          </Pressable>
        </View>
        <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
          <Feather name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search conversations..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            testID="search-input"
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => setSearchQuery("")}>
              <Feather name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        renderItem={renderConversation}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: tabBarHeight + Spacing.lg },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={loadingConversations}
            onRefresh={refetch}
            tintColor={theme.primary}
          />
        }
        ListEmptyComponent={<EmptyConversations />}
        testID="conversations-list"
      />

      <Modal
        visible={showNewMessage}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewMessage(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Pressable onPress={() => setShowNewMessage(false)}>
              <ThemedText style={{ color: theme.primary }}>Cancel</ThemedText>
            </Pressable>
            <ThemedText style={styles.modalTitle}>New Message</ThemedText>
            <View style={{ width: 50 }} />
          </View>

          <View style={[styles.searchContainer, { backgroundColor: theme.surface, margin: Spacing.md }]}>
            <Feather name="search" size={18} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search workers..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              testID="worker-search-input"
            />
          </View>

          <FlatList
            data={filteredWorkers}
            keyExtractor={(item) => item.id}
            renderItem={renderWorker}
            contentContainerStyle={styles.list}
            ListEmptyComponent={loadingWorkers ? null : <EmptyWorkers />}
            testID="workers-list"
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  newButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    flexGrow: 1,
  },
  conversationCard: {
    padding: Spacing.md,
  },
  conversationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  conversationContent: {
    flex: 1,
    gap: 4,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  workerName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  time: {
    fontSize: 12,
    marginLeft: Spacing.sm,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  preview: {
    fontSize: 14,
    flex: 1,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: Spacing.md,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
});
