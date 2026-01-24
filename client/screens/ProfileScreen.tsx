import React, { useState } from "react";
import { View, StyleSheet, Pressable, Switch, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { UserRole } from "@/types";

const roleLabels: Record<UserRole, string> = {
  client: "Client",
  worker: "Worker",
  hr: "HR Manager",
  admin: "Administrator",
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user, logout, switchRole } = useAuth();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogout = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logout();
  };

  const handleRoleSwitch = async (role: UserRole) => {
    await Haptics.selectionAsync();
    await switchRole(role);
  };

  const roles: UserRole[] = ["client", "worker", "hr", "admin"];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: tabBarHeight + Spacing.xl,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <View style={styles.header}>
        <Avatar name={user?.fullName} role={user?.role} size={80} />
        <ThemedText type="h2" style={styles.name}>
          {user?.fullName}
        </ThemedText>
        <ThemedText style={[styles.email, { color: theme.textSecondary }]}>
          {user?.email}
        </ThemedText>
        <View
          style={[
            styles.roleBadge,
            { backgroundColor: theme.primary + "15" },
          ]}
        >
          <ThemedText style={[styles.roleText, { color: theme.primary }]}>
            {roleLabels[user?.role || "client"]}
          </ThemedText>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Demo: Switch Role
        </ThemedText>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          {roles.map((role, index) => (
            <Pressable
              key={role}
              onPress={() => handleRoleSwitch(role)}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && { backgroundColor: theme.backgroundSecondary },
                index < roles.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                },
              ]}
            >
              <View style={styles.menuItemContent}>
                <ThemedText style={styles.menuItemText}>
                  {roleLabels[role]}
                </ThemedText>
                {user?.role === role ? (
                  <Feather name="check" size={20} color={theme.primary} />
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Settings
        </ThemedText>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <View style={styles.menuItemContent}>
              <View style={styles.menuItemLeft}>
                <Feather name="bell" size={20} color={theme.text} />
                <ThemedText style={styles.menuItemText}>
                  Notifications
                </ThemedText>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={(value) => {
                  setNotificationsEnabled(value);
                  Haptics.selectionAsync();
                }}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              pressed && { backgroundColor: theme.backgroundSecondary },
              { borderBottomWidth: 1, borderBottomColor: theme.border },
            ]}
          >
            <View style={styles.menuItemContent}>
              <View style={styles.menuItemLeft}>
                <Feather name="globe" size={20} color={theme.text} />
                <ThemedText style={styles.menuItemText}>
                  Timezone
                </ThemedText>
              </View>
              <View style={styles.menuItemRight}>
                <ThemedText style={[styles.menuItemValue, { color: theme.textSecondary }]}>
                  {user?.timezone || "America/Toronto"}
                </ThemedText>
                <Feather name="chevron-right" size={20} color={theme.textMuted} />
              </View>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              pressed && { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <View style={styles.menuItemContent}>
              <View style={styles.menuItemLeft}>
                <Feather name="info" size={20} color={theme.text} />
                <ThemedText style={styles.menuItemText}>
                  About
                </ThemedText>
              </View>
              <View style={styles.menuItemRight}>
                <ThemedText style={[styles.menuItemValue, { color: theme.textSecondary }]}>
                  v1.0.0
                </ThemedText>
                <Feather name="chevron-right" size={20} color={theme.textMuted} />
              </View>
            </View>
          </Pressable>
        </View>
      </View>

      <View style={styles.logoutSection}>
        <Button onPress={handleLogout} style={[styles.logoutButton, { backgroundColor: theme.error }]}>
          Sign Out
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  name: {
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  email: {
    marginTop: Spacing.xs,
    fontSize: 14,
  },
  roleBadge: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  roleText: {
    fontSize: 13,
    fontWeight: "600",
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: Spacing.xs,
  },
  card: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  menuItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  menuItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  menuItemText: {
    fontSize: 16,
  },
  menuItemValue: {
    fontSize: 14,
  },
  logoutSection: {
    marginTop: Spacing.lg,
  },
  logoutButton: {
    marginBottom: Spacing.lg,
  },
});
