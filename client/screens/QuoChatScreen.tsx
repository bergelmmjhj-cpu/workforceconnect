import React, { useState, useRef, useLayoutEffect } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { HeaderButton } from "@react-navigation/elements";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { QuoMessage, QuoConversation } from "@/types";
import { getApiUrl } from "@/lib/query-client";
import { formatTime } from "@/utils/format";

type RouteParams = { conversationId: string };

export default function QuoChatScreen() {
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

  const { data: conversations } = useQuery<QuoConversation[]>({
    queryKey: ["/api/quo/conversations"],
    enabled: false,
  });

  const conversation = conversations?.find((c) => c.id === conversationId);

  const handleCall = async () => {
    if (!conversation) return;
    const cleanNumber = conversation.participantPhone.replace(/[^\d+]/g, "");
    const telUrl = `tel:${cleanNumber}`;
    
    try {
      const canOpen = await Linking.canOpenURL(telUrl);
      if (canOpen) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await Linking.openURL(telUrl);
      } else {
        Alert.alert("Cannot Make Call", "Your device doesn't support phone calls.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open dialer.");
    }
  };

  const handleSms = async () => {
    if (!conversation) return;
    const cleanNumber = conversation.participantPhone.replace(/[^\d+]/g, "");
    const smsUrl = `sms:${cleanNumber}`;
    
    try {
      const canOpen = await Linking.canOpenURL(smsUrl);
      if (canOpen) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await Linking.openURL(smsUrl);
      } else {
        Alert.alert("Cannot Send SMS", "Your device doesn't support SMS messaging.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open messaging app.");
    }
  };

  useLayoutEffect(() => {
    if (conversation) {
      navigation.setOptions({
        headerTitle: conversation.participantName || conversation.participantPhone,
        headerRight: () => (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <HeaderButton onPress={handleSms}>
              <Feather name="message-square" size={22} color={theme.primary} />
            </HeaderButton>
            <HeaderButton onPress={handleCall}>
              <Feather name="phone" size={22} color={theme.success} />
            </HeaderButton>
          </View>
        ),
      });
    }
  }, [conversation, navigation, theme]);

  const { data: messages, isLoading, refetch } = useQuery<QuoMessage[]>({
    queryKey: ["/api/quo/conversations", conversationId, "messages"],
    queryFn: async () => {
      const res = await fetch(`${getApiUrl()}api/quo/conversations/${conversationId}/messages`, {
        headers: { "x-user-role": user?.role || "admin" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    enabled: !!conversationId && !!user && (user.role === "admin" || user.role === "hr"),
    refetchInterval: 5000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { toNumber: string; body: string; conversationId: string }) => {
      const res = await fetch(`${getApiUrl()}api/quo/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-role": user?.role || "admin",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send message");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quo/conversations", conversationId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quo/conversations"] });
      setInputText("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const handleSend = () => {
    if (!inputText.trim() || !conversation) return;
    sendMessageMutation.mutate({
      toNumber: conversation.participantPhone,
      body: inputText.trim(),
      conversationId,
    });
  };

  const renderMessage = ({ item }: { item: QuoMessage }) => {
    const isOutbound = item.direction === "outbound";
    return (
      <View
        style={[
          styles.messageBubble,
          isOutbound ? styles.outboundBubble : styles.inboundBubble,
          { backgroundColor: isOutbound ? theme.primary : theme.backgroundSecondary },
        ]}
      >
        <ThemedText style={[styles.messageText, isOutbound && { color: "#fff" }]}>
          {item.body}
        </ThemedText>
        <View style={styles.messageFooter}>
          <ThemedText
            style={[
              styles.messageTime,
              { color: isOutbound ? "rgba(255,255,255,0.7)" : theme.textSecondary },
            ]}
          >
            {item.sentAt ? formatTime(item.sentAt) : ""}
          </ThemedText>
          {isOutbound ? (
            <Feather
              name={item.status === "delivered" ? "check-circle" : "check"}
              size={12}
              color="rgba(255,255,255,0.7)"
              style={{ marginLeft: 4 }}
            />
          ) : null}
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <ThemedText style={{ color: theme.textSecondary }}>No messages yet</ThemedText>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <FlatList
        ref={flatListRef}
        data={messages?.length ? [...messages].reverse() : []}
        inverted={messages?.length ? true : false}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.messagesList,
          { paddingTop: headerHeight + Spacing.md },
          messages?.length === 0 && styles.emptyList,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      />

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.backgroundRoot,
            paddingBottom: insets.bottom || Spacing.md,
            borderTopColor: theme.border,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            { backgroundColor: theme.inputBackground, color: theme.text },
          ]}
          placeholder="Type a message..."
          placeholderTextColor={theme.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          multiline
          testID="input-message"
        />
        <Pressable
          style={[
            styles.sendButton,
            { backgroundColor: inputText.trim() ? theme.primary : theme.border },
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || sendMessageMutation.isPending}
          testID="button-send"
        >
          <Feather name="send" size={20} color={inputText.trim() ? "#fff" : theme.textSecondary} />
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    padding: Spacing.xl,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginVertical: 4,
  },
  outboundBubble: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  inboundBubble: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
