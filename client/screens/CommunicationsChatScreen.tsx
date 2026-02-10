import React, { useState, useRef, useLayoutEffect, useEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { formatTime } from "@/utils/format";

type RouteParams = { conversationId: string };

type Message = {
  id: string;
  conversationId: string;
  senderUserId: string;
  recipientUserId: string;
  body: string;
  messageType: string;
  mediaUrl: string | null;
  readAt: string | null;
  status: string;
  createdAt: string;
  senderName: string | null;
};

type Conversation = {
  id: string;
  workerUserId: string;
  hrUserId: string | null;
  workerName: string | null;
  workerEmail: string | null;
  hrName?: string | null;
  hrEmail?: string | null;
};

export default function CommunicationsChatScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const route = useRoute();
  const navigation = useNavigation();
  const { conversationId } = route.params as RouteParams;
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const { data: conversations } = useQuery<any[]>({
    queryKey: ["/api/communications/conversations"],
    queryFn: async () => {
      const res = await fetch(
        `${getApiUrl()}api/communications/conversations`,
        {
          headers: {
            "x-user-role": user?.role || "worker",
            "x-user-id": user?.id || "",
          },
          credentials: "include",
        }
      );
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const conversation = conversations?.find((c) => c.id === conversationId);

  useLayoutEffect(() => {
    if (conversation) {
      const isWorker = user?.role === "worker";
      const title = isWorker 
        ? (conversation as any).hrName || "HR Representative"
        : conversation.workerName || "Worker";
      navigation.setOptions({ headerTitle: title });
    }
  }, [conversation, navigation, user]);

  const { data: messages, isLoading, refetch } = useQuery<Message[]>({
    queryKey: ["/api/communications/conversations", conversationId, "messages"],
    queryFn: async () => {
      const res = await fetch(
        `${getApiUrl()}api/communications/conversations/${conversationId}/messages`,
        {
          headers: {
            "x-user-role": user?.role || "hr",
            "x-user-id": user?.id || "",
          },
          credentials: "include",
        }
      );
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!conversationId && !!user,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (messages && messages.length > 0) {
      fetch(`${getApiUrl()}api/communications/conversations/${conversationId}/read`, {
        method: "POST",
        headers: {
          "x-user-role": user?.role || "hr",
          "x-user-id": user?.id || "",
        },
        credentials: "include",
      }).catch(() => {});
    }
  }, [messages, conversationId, user]);

  const sendMessageMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await fetch(
        `${getApiUrl()}api/communications/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-role": user?.role || "hr",
            "x-user-id": user?.id || "",
          },
          credentials: "include",
          body: JSON.stringify({ body }),
        }
      );
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/communications/conversations", conversationId, "messages"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/communications/conversations"] });
      setInputText("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessageMutation.mutate(inputText.trim());
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderUserId === user?.id;
    const isHR = user?.role === "hr" || user?.role === "admin";

    return (
      <View
        style={[
          styles.messageContainer,
          isMe ? styles.messageRight : styles.messageLeft,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isMe
              ? { backgroundColor: theme.primary }
              : { backgroundColor: theme.surface },
          ]}
        >
          {!isMe && item.senderName ? (
            <ThemedText
              style={[styles.senderName, { color: theme.primary }]}
            >
              {item.senderName}
            </ThemedText>
          ) : null}
          <ThemedText
            style={[
              styles.messageText,
              { color: isMe ? "#fff" : theme.text },
            ]}
          >
            {item.body}
          </ThemedText>
          <View style={styles.messageFooter}>
            <ThemedText
              style={[
                styles.messageTime,
                { color: isMe ? "rgba(255,255,255,0.7)" : theme.textMuted },
              ]}
            >
              {formatTime(item.createdAt)}
            </ThemedText>
            {isMe && item.status === "read" ? (
              <Feather
                name="check-circle"
                size={12}
                color="rgba(255,255,255,0.7)"
                style={{ marginLeft: 4 }}
              />
            ) : isMe ? (
              <Feather
                name="check"
                size={12}
                color="rgba(255,255,255,0.7)"
                style={{ marginLeft: 4 }}
              />
            ) : null}
          </View>
        </View>
      </View>
    );
  };

  const EmptyMessages = () => (
    <View style={styles.emptyContainer}>
      <Feather name="message-circle" size={48} color={theme.textMuted} />
      <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
        No Messages Yet
      </ThemedText>
      <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
        Send a message to start the conversation.
      </ThemedText>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior="padding"
      keyboardVerticalOffset={headerHeight}
    >
      <FlatList
        ref={flatListRef}
        data={messages ? [...messages].reverse() : []}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={[
          styles.messagesList,
          { paddingTop: Spacing.md },
        ]}
        inverted={messages && messages.length > 0}
        ListEmptyComponent={isLoading ? null : <EmptyMessages />}
        testID="messages-list"
      />

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.md,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.inputBackground, color: theme.text },
          ]}
          placeholder="Type a message..."
          placeholderTextColor={theme.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={2000}
          testID="message-input"
        />
        <Pressable
          onPress={handleSend}
          disabled={!inputText.trim() || sendMessageMutation.isPending}
          style={[
            styles.sendButton,
            {
              backgroundColor: inputText.trim()
                ? theme.primary
                : theme.backgroundSecondary,
            },
          ]}
          testID="send-button"
        >
          {sendMessageMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather
              name="send"
              size={20}
              color={inputText.trim() ? "#fff" : theme.textMuted}
            />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    flexGrow: 1,
  },
  messageContainer: {
    marginVertical: Spacing.xs,
    maxWidth: "80%",
  },
  messageLeft: {
    alignSelf: "flex-start",
  },
  messageRight: {
    alignSelf: "flex-end",
  },
  messageBubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
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
