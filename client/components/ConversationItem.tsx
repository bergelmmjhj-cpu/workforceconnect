import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { Conversation } from "@/types";
import { formatRelativeTime } from "@/utils/format";

interface ConversationItemProps {
  conversation: Conversation;
  onPress?: () => void;
}

export function ConversationItem({ conversation, onPress }: ConversationItemProps) {
  const { theme } = useTheme();

  const otherParticipant = conversation.participants[0];
  const hasUnread = conversation.unreadCount > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed
            ? theme.backgroundSecondary
            : theme.surface,
        },
      ]}
    >
      <View style={styles.avatarContainer}>
        <Avatar
          name={otherParticipant?.name}
          role={otherParticipant?.role}
          size={48}
        />
        {hasUnread ? (
          <View
            style={[styles.unreadDot, { backgroundColor: theme.primary }]}
          />
        ) : null}
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <ThemedText
            type="h4"
            numberOfLines={1}
            style={[styles.name, hasUnread && styles.nameUnread]}
          >
            {otherParticipant?.name || "Unknown"}
          </ThemedText>
          {conversation.lastMessageAt ? (
            <ThemedText
              style={[
                styles.time,
                { color: hasUnread ? theme.primary : theme.textMuted },
              ]}
            >
              {formatRelativeTime(conversation.lastMessageAt)}
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.bottomRow}>
          <ThemedText
            numberOfLines={1}
            style={[
              styles.preview,
              {
                color: hasUnread ? theme.text : theme.textSecondary,
                fontWeight: hasUnread ? "500" : "400",
              },
            ]}
          >
            {conversation.lastMessage || "No messages yet"}
          </ThemedText>
          {hasUnread ? (
            <View
              style={[styles.badge, { backgroundColor: theme.primary }]}
            >
              <ThemedText style={styles.badgeText}>
                {conversation.unreadCount > 9 ? "9+" : conversation.unreadCount}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  avatarContainer: {
    position: "relative",
  },
  unreadDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  name: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  nameUnread: {
    fontWeight: "700",
  },
  time: {
    fontSize: 12,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  preview: {
    flex: 1,
    fontSize: 14,
    marginRight: Spacing.sm,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
});
