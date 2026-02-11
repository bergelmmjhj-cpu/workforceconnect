import React from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { ConversationSkeleton } from "@/components/LoadingSkeleton";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useContentPadding } from "@/hooks/useContentPadding";
import { Spacing, BorderRadius } from "@/constants/theme";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  hrUserId: string;
  workerUserId: string;
  hrName: string;
  workerName: string;
  lastMessageText: string | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { paddingTop } = useContentPadding();
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { user } = useAuth();

  const { data: conversations = [], isLoading, refetch, isRefetching } = useQuery<Conversation[]>({
    queryKey: ["/api/communications/conversations"],
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  const handleConversationPress = (conversation: Conversation) => {
    Haptics.selectionAsync();
    navigation.navigate("CommunicationsChat", {
      conversationId: conversation.id,
    });
  };

  const getOtherPartyName = (conversation: Conversation) => {
    if (user?.role === "worker") {
      return conversation.hrName || "HR Representative";
    }
    return conversation.workerName || "Worker";
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const otherPartyName = getOtherPartyName(item);
    const initials = otherPartyName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    const hasUnread = item.unreadCount > 0;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.conversationItem,
          { backgroundColor: pressed ? theme.surface : "transparent" },
        ]}
        onPress={() => handleConversationPress(item)}
      >
        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
          <ThemedText style={styles.avatarText}>{initials}</ThemedText>
        </View>
        <View style={styles.conversationContent}>
          <View style={styles.conversationHeader}>
            <ThemedText
              style={[styles.name, hasUnread && { fontWeight: "700" }]}
            >
              {otherPartyName}
            </ThemedText>
            {item.lastMessageAt ? (
              <ThemedText style={styles.time}>
                {formatDistanceToNow(new Date(item.lastMessageAt), {
                  addSuffix: true,
                })}
              </ThemedText>
            ) : null}
          </View>
          <View style={styles.messagePreview}>
            <ThemedText
              numberOfLines={1}
              style={[
                styles.lastMessage,
                { color: hasUnread ? theme.text : theme.textSecondary },
                hasUnread && { fontWeight: "600" },
              ]}
            >
              {item.lastMessagePreview || item.lastMessageText || "No messages yet"}
            </ThemedText>
            {hasUnread ? (
              <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                <ThemedText style={styles.badgeText}>
                  {item.unreadCount}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </Pressable>
    );
  };

  const renderEmpty = () => (
    <EmptyState
      image={require("../../assets/images/empty-messages.png")}
      title="No messages yet"
      description={
        user?.role === "worker"
          ? "HR will reach out to you here when needed"
          : "Start a conversation with a worker"
      }
    />
  );

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: paddingTop,
          },
        ]}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <ConversationSkeleton key={i} />
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: paddingTop,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
          conversations.length === 0 ? styles.emptyContent : undefined,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor={theme.primary}
          />
        }
        renderItem={renderConversation}
        ItemSeparatorComponent={() => (
          <View
            style={[
              styles.separator,
              { backgroundColor: theme.border, marginLeft: 76 },
            ]}
          />
        )}
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  conversationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  conversationContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
  },
  time: {
    fontSize: 12,
    opacity: 0.6,
  },
  messagePreview: {
    flexDirection: "row",
    alignItems: "center",
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: Spacing.sm,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  separator: {
    height: 1,
  },
});
