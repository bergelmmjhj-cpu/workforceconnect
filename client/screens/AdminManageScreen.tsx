import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Spacing } from "@/constants/theme";

type AdminMenuItemProps = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  onPress: () => void;
};

function AdminMenuItem({ icon, title, description, onPress }: AdminMenuItemProps) {
  const { theme } = useTheme();

  return (
    <Card style={styles.menuCard} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: theme.primary + "20" }]}>
        <Feather name={icon} size={24} color={theme.primary} />
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
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const menuItems: AdminMenuItemProps[] = [
    {
      icon: "map-pin",
      title: "Workplaces",
      description: "Manage work locations and GPS geofences",
      onPress: () => navigation.navigate("WorkplacesList"),
    },
    {
      icon: "users",
      title: "Worker Directory",
      description: "View workers and assign to workplaces",
      onPress: () => navigation.navigate("WorkerDirectory"),
    },
    {
      icon: "clock",
      title: "TITO Logs",
      description: "Review time tracking records",
      onPress: () => navigation.navigate("TitoLogsAdmin"),
    },
    {
      icon: "file-text",
      title: "Applications",
      description: "Review worker applications",
      onPress: () => navigation.navigate("ApplicationsAdmin"),
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
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
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 15,
    opacity: 0.6,
  },
  menuList: {
    gap: Spacing.md,
  },
  menuCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 13,
    opacity: 0.6,
  },
});
