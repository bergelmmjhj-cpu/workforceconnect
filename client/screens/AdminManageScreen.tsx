import React from "react";
import { View, StyleSheet, ScrollView, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Layout } from "@/constants/theme";
import { useIsWideWeb } from "@/components/WebSidebarLayout";
import { rootNavigate } from "@/lib/navigation";

type AdminMenuItemProps = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
};

function AdminMenuItem({ icon, title, description, onPress }: AdminMenuItemProps) {
  const { theme } = useTheme();
  const isWideWeb = useIsWideWeb();

  return (
    <Card style={styles.menuCard} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: theme.primary + "20" }]}>
        <Feather name={icon} size={20} color={theme.primary} />
      </View>
      <View style={styles.menuTextContainer}>
        <ThemedText style={styles.menuTitle}>{title}</ThemedText>
        <ThemedText style={styles.menuDescription}>{description}</ThemedText>
      </View>
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </Card>
  );
}

export default function AdminManageScreen() {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const isWideWeb = useIsWideWeb();

  const menuItems: AdminMenuItemProps[] = [
    {
      icon: "map-pin",
      title: "Workplaces",
      description: "Manage work locations and GPS geofences",
      onPress: () => rootNavigate("WorkplacesList"),
    },
    {
      icon: "users",
      title: "Worker Directory",
      description: "View workers and assign to workplaces",
      onPress: () => rootNavigate("WorkerDirectory"),
    },
    {
      icon: "clock",
      title: "TITO Logs",
      description: "Review time tracking records",
      onPress: () => rootNavigate("TitoLogsAdmin"),
    },
    {
      icon: "file-text",
      title: "Applications",
      description: "Review worker applications",
      onPress: () => rootNavigate("ApplicationsAdmin"),
    },
    {
      icon: "refresh-cw",
      title: "CRM Sync",
      description: "Sync data from Weekdays CRM",
      onPress: () => rootNavigate("CrmSync"),
    },
    {
      icon: "cpu",
      title: "AI Operations Assistant",
      description: "Automated monitoring for leads, shifts, and accounts",
      onPress: () => rootNavigate("AiAssistant"),
    },
    {
      icon: "user-check",
      title: "User Management",
      description: "Create, edit, approve, and invite HR/Client users",
      onPress: () => rootNavigate("UserManagement"),
    },
  ];

  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? Spacing.md : headerHeight + Spacing.md;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: topPadding, paddingBottom: insets.bottom + Spacing.lg },
          isWideWeb && { maxWidth: Layout.listMaxWidth, alignSelf: 'center', width: '100%' },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <ThemedText style={styles.sectionTitle}>Management Hub</ThemedText>
          <ThemedText style={styles.sectionSubtitle}>
            Admin tools for workforce management
          </ThemedText>
        </View>

        <View style={styles.menuList}>
          {menuItems.map((item, index) => (
            <AdminMenuItem key={index} {...item} />
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
  },
  headerSection: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    opacity: 0.6,
  },
  menuList: {
    gap: Spacing.sm,
  },
  menuCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 1,
  },
  menuDescription: {
    fontSize: 12,
    opacity: 0.6,
  },
});
