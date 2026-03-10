import React from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { ListSkeleton } from "@/components/LoadingSkeleton";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useContentPadding } from "@/hooks/useContentPadding";
import { apiRequest, queryClient } from "@/lib/query-client";
import { Spacing, BorderRadius, Layout } from "@/constants/theme";
import { useIsWideWeb } from "@/components/WebSidebarLayout";

interface Notification {
  id: number;
  userId: number;
  type: string;
  title: string;
  body: string;
  deepLink: string | null;
  metadata: any;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

const typeIcons: Record<string, keyof typeof Feather.glyphMap> = {
  shift_offer: "briefcase",
  shift_assigned: "check-circle",
  shift_declined: "x-circle",
  shift_cancelled: "slash",
  shift_reminder: "clock",
  checkin_issue: "alert-triangle",
  message: "message-circle",
};

function getIconForType(type: string): keyof typeof Feather.glyphMap {
  return typeIcons[type] || "bell";
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const isWideWeb = useIsWideWeb();
  const { user } = useAuth();
  const { paddingTop, paddingBottom } = useContentPadding();

  const {
    data,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<NotificationsResponse>({
    queryKey: ["/api/notifications"],
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
  });

  const handleNotificationPress = (item: Notification) => {
    Haptics.selectionAsync();
    if (!item.readAt) {
      markReadMutation.mutate(item.id);
    }
  };

  const handleMarkAllRead = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    markAllReadMutation.mutate();
  };

  const renderHeader = () => (
    unreadCount > 0 ? (
      <View style={styles.headerContainer}>
        <Pressable
          onPress={handleMarkAllRead}
          testID="button-mark-all-read"
          style={styles.markAllButton}
        >
          <ThemedText style={[styles.markAllText, { color: theme.primary }]}>
            Mark All Read
          </ThemedText>
        </Pressable>
      </View>
    ) : null
  );

  const renderNotification = ({ item }: { item: Notification }) => {
    const isUnread = !item.readAt;
    const iconName = getIconForType(item.type);

    return (
      <Pressable
        onPress={() => handleNotificationPress(item)}
        testID={`notification-card-${item.id}`}
        style={({ pressed }) => [
          styles.notificationCard,
          {
            backgroundColor: isUnread
              ? theme.backgroundDefault
              : theme.backgroundSecondary,
            borderLeftColor: isUnread ? theme.primary : "transparent",
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isUnread
                ? theme.primaryLight + "20"
                : theme.backgroundTertiary,
            },
          ]}
        >
          <Feather
            name={iconName}
            size={18}
            color={isUnread ? theme.primary : theme.textMuted}
          />
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <ThemedText
              type="h4"
              style={styles.notificationTitle}
              numberOfLines={1}
            >
              {item.title}
            </ThemedText>
            <ThemedText
              type="small"
              style={{ color: theme.textMuted, fontSize: 12 }}
            >
              {formatRelativeTime(item.createdAt)}
            </ThemedText>
          </View>
          <ThemedText
            type="small"
            style={{ color: theme.textSecondary }}
            numberOfLines={2}
          >
            {item.body}
          </ThemedText>
        </View>
      </Pressable>
    );
  };

  const renderEmpty = () => (
    <EmptyState
      image={require("../../assets/images/empty-messages.png")}
      title="No notifications"
      description="You're all caught up! New notifications will appear here."
    />
  );

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop,
            paddingHorizontal: Spacing.lg,
          },
        ]}
      >
        <ListSkeleton count={5} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop, paddingBottom },
          notifications.length === 0 ? styles.emptyContent : undefined,
          isWideWeb && { maxWidth: Layout.listMaxWidth, alignSelf: 'center', width: '100%' },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.primary}
          />
        }
        renderItem={renderNotification}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={renderHeader}
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
    paddingHorizontal: Spacing.lg,
  },
  emptyContent: {
    flexGrow: 1,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: Spacing.md,
  },
  markAllButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: "600",
  },
  separator: {
    height: Spacing.sm,
  },
  notificationCard: {
    flexDirection: "row",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderLeftWidth: 4,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  contentContainer: {
    flex: 1,
    gap: Spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  notificationTitle: {
    flex: 1,
  },
});
