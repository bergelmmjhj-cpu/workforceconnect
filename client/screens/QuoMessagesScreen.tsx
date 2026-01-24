import React, { useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  TextInput,
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useContentPadding } from "@/hooks/useContentPadding";
import { Spacing, BorderRadius } from "@/constants/theme";
import { QuoConversation } from "@/types";
import { getApiUrl } from "@/lib/query-client";
import { formatRelativeTime } from "@/utils/format";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function QuoMessagesScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { paddingTop } = useContentPadding();
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newBody, setNewBody] = useState("");

  const { data: conversations, isLoading, refetch } = useQuery<QuoConversation[]>({
    queryKey: ["/api/quo/conversations"],
    queryFn: async () => {
      const res = await fetch(`${getApiUrl()}api/quo/conversations`, {
        headers: { "x-user-role": user?.role || "admin" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
    enabled: !!user && (user.role === "admin" || user.role === "hr"),
  });

  const handleConversationPress = (conv: QuoConversation) => {
    Haptics.selectionAsync();
    (navigation as any).navigate("QuoChat", { conversationId: conv.id });
  };

  const handleOpenSms = async (phoneNumber: string, body?: string) => {
    const cleanNumber = phoneNumber.replace(/[^\d+]/g, "");
    let smsUrl = `sms:${cleanNumber}`;
    if (body) {
      smsUrl += `?body=${encodeURIComponent(body)}`;
    }
    
    try {
      const canOpen = await Linking.canOpenURL(smsUrl);
      if (canOpen) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await Linking.openURL(smsUrl);
        setShowNewMessage(false);
        setNewPhone("");
        setNewBody("");
      } else {
        Alert.alert("Cannot Send SMS", "Your device doesn't support SMS messaging.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open messaging app.");
    }
  };

  const handleSendNew = () => {
    if (newPhone.trim()) {
      handleOpenSms(newPhone.trim(), newBody.trim() || undefined);
    }
  };

  const renderItem = ({ item }: { item: QuoConversation }) => (
    <Pressable onPress={() => handleConversationPress(item)}>
      <Card style={styles.conversationCard}>
        <View style={styles.conversationRow}>
          <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.avatarText}>
              {item.participantName?.charAt(0).toUpperCase() || "?"}
            </ThemedText>
          </View>
          <View style={styles.conversationInfo}>
            <ThemedText type="h4" numberOfLines={1}>
              {item.participantName || item.participantPhone}
            </ThemedText>
            <ThemedText style={[styles.phone, { color: theme.textSecondary }]}>
              {item.participantPhone}
            </ThemedText>
            {item.lastMessageAt ? (
              <ThemedText style={[styles.time, { color: theme.textSecondary }]}>
                {formatRelativeTime(item.lastMessageAt)}
              </ThemedText>
            ) : null}
          </View>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </View>
      </Card>
    </Pressable>
  );

  const renderEmpty = () => (
    <EmptyState
      image={require("../../assets/images/empty-messages.png")}
      title="No conversations"
      description="Start a new conversation by tapping the button below"
    />
  );

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot, paddingTop }]}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} style={styles.conversationCard}>
            <View style={[styles.conversationRow, { opacity: 0.5 }]}>
              <View style={[styles.avatar, { backgroundColor: theme.border }]} />
              <View style={styles.conversationInfo}>
                <View style={[styles.skeletonLine, { backgroundColor: theme.border }]} />
                <View style={[styles.skeletonLineShort, { backgroundColor: theme.border }]} />
              </View>
            </View>
          </Card>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={conversations || []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop, paddingBottom: tabBarHeight + Spacing.xl },
          (conversations?.length || 0) === 0 && styles.emptyContent,
        ]}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => refetch()} tintColor={theme.primary} />
        }
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      />

      {showNewMessage ? (
        <View style={[styles.newMessageCard, { bottom: tabBarHeight + Spacing.lg, backgroundColor: theme.surface, borderRadius: BorderRadius.lg }]}>
          <ThemedText type="h4" style={styles.newMessageTitle}>New Message</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
            placeholder="Enter phone number"
            placeholderTextColor={theme.textSecondary}
            value={newPhone}
            onChangeText={setNewPhone}
            keyboardType="phone-pad"
            testID="input-new-phone"
          />
          <TextInput
            style={[styles.input, styles.bodyInput, { backgroundColor: theme.inputBackground, color: theme.text }]}
            placeholder="Message (optional)"
            placeholderTextColor={theme.textSecondary}
            value={newBody}
            onChangeText={setNewBody}
            multiline
            testID="input-new-body"
          />
          <View style={styles.newMessageActions}>
            <Pressable
              onPress={() => setShowNewMessage(false)}
              style={[styles.actionButton, { backgroundColor: theme.border }]}
            >
              <ThemedText>Cancel</ThemedText>
            </Pressable>
            <Pressable
              onPress={handleSendNew}
              style={[styles.actionButton, { backgroundColor: theme.primary }]}
              disabled={!newPhone.trim()}
            >
              <Feather name="message-square" size={16} color="#fff" style={{ marginRight: 6 }} />
              <ThemedText style={{ color: "#fff" }}>Open SMS</ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {!showNewMessage ? (
        <Pressable
          style={[styles.fab, { backgroundColor: theme.primary, bottom: tabBarHeight + Spacing.lg }]}
          onPress={() => {
            Haptics.selectionAsync();
            setShowNewMessage(true);
          }}
          testID="button-new-message"
        >
          <Feather name="edit" size={24} color="#fff" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: "center",
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
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  conversationInfo: {
    flex: 1,
    gap: 2,
  },
  phone: {
    fontSize: 13,
  },
  time: {
    fontSize: 12,
  },
  skeletonLine: {
    height: 16,
    width: "70%",
    borderRadius: 4,
    marginBottom: 6,
  },
  skeletonLineShort: {
    height: 14,
    width: "40%",
    borderRadius: 4,
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  newMessageCard: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    padding: Spacing.lg,
    elevation: 10,
    zIndex: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  newMessageTitle: {
    marginBottom: Spacing.md,
  },
  input: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    fontSize: 16,
  },
  bodyInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  newMessageActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
});
