import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useRoute, useNavigation } from "@react-navigation/native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Message, Conversation } from "@/types";
import { getMessages, getConversation, sendMessage } from "@/storage";
import { formatTime } from "@/utils/format";

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const { conversationId } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");

  const loadData = useCallback(async () => {
    try {
      const [conv, msgs] = await Promise.all([
        getConversation(conversationId),
        getMessages(conversationId),
      ]);
      setConversation(conv);
      setMessages(msgs);
      
      if (conv) {
        const otherParticipant = conv.participants.find(p => p.id !== user?.id);
        navigation.setOptions({
          headerTitle: otherParticipant?.name || "Chat",
        });
      }
    } catch (error) {
      console.error("Failed to load chat:", error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, user, navigation]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSend = async () => {
    if (!inputText.trim() || !user) return;

    setIsSending(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const newMessage = await sendMessage({
        conversationId,
        senderId: user.id,
        senderName: user.fullName,
        senderRole: user.role,
        content: inputText.trim(),
      });

      setMessages((prev) => [...prev, newMessage]);
      setInputText("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.senderId === user?.id;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        {!isOwnMessage ? (
          <Avatar name={item.senderName} role={item.senderRole} size={32} />
        ) : null}
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: isOwnMessage
                ? theme.primary
                : theme.backgroundSecondary,
            },
          ]}
        >
          <ThemedText
            style={[
              styles.messageText,
              { color: isOwnMessage ? "#fff" : theme.text },
            ]}
          >
            {item.content}
          </ThemedText>
          <ThemedText
            style={[
              styles.timeText,
              {
                color: isOwnMessage
                  ? "rgba(255,255,255,0.7)"
                  : theme.textMuted,
              },
            ]}
          >
            {formatTime(item.createdAt)}
          </ThemedText>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <ThemedText style={[styles.emptyText, { color: theme.textMuted }]}>
        Start the conversation
      </ThemedText>
    </View>
  );

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          styles.loadingContainer,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        inverted={messages.length > 0}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: headerHeight + Spacing.md },
        ]}
        renderItem={renderMessage}
        ListEmptyComponent={renderEmpty}
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }
        }}
      />

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom || Spacing.md,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.backgroundSecondary,
              color: theme.text,
            },
          ]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor={theme.textMuted}
          multiline
          maxLength={1000}
        />
        <Pressable
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
          style={({ pressed }) => [
            styles.sendButton,
            {
              backgroundColor: inputText.trim()
                ? theme.primary
                : theme.backgroundSecondary,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          {isSending ? (
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
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: "row",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  ownMessage: {
    justifyContent: "flex-end",
  },
  otherMessage: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "75%",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  timeText: {
    fontSize: 11,
    marginTop: Spacing.xs,
    alignSelf: "flex-end",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
