import React from "react";
import {
  View,
  StyleSheet,
  Image,
  Pressable,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useNavigationState, useNavigation, CommonActions } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useWorkerOnboarding } from "@/contexts/WorkerOnboardingContext";
import { Spacing, BorderRadius } from "@/constants/theme";

export const SIDEBAR_WIDTH = 220;

const TAB_ROUTES_BY_ROLE: Record<string, { name: string; label: string; icon: keyof typeof Feather.glyphMap }[]> = {
  admin: [
    { name: "Dashboard", label: "Dashboard", icon: "home" },
    { name: "ShiftRequests", label: "Requests", icon: "send" },
    { name: "Management", label: "Management", icon: "briefcase" },
    { name: "Tito", label: "TITO", icon: "clock" },
    { name: "Profile", label: "Settings", icon: "settings" },
  ],
  hr: [
    { name: "Dashboard", label: "Dashboard", icon: "home" },
    { name: "ShiftRequests", label: "Requests", icon: "send" },
    { name: "Management", label: "Management", icon: "briefcase" },
    { name: "Tito", label: "TITO", icon: "clock" },
    { name: "Profile", label: "Account", icon: "user" },
  ],
  client: [
    { name: "Dashboard", label: "Dashboard", icon: "home" },
    { name: "Requests", label: "Requests", icon: "file-text" },
    { name: "Shifts", label: "Shifts", icon: "calendar" },
    { name: "Messages", label: "Messages", icon: "message-circle" },
    { name: "Profile", label: "Account", icon: "user" },
  ],
  worker: [
    { name: "Dashboard", label: "Dashboard", icon: "home" },
    { name: "ShiftOffers", label: "Offers", icon: "inbox" },
    { name: "Shifts", label: "My Shifts", icon: "calendar" },
    { name: "Tito", label: "TITO", icon: "clock" },
    { name: "Profile", label: "Account", icon: "user" },
  ],
};

function getActiveTabFromNavState(state: any): string | null {
  if (!state) return null;
  const currentRoute = state.routes[state.index];
  if (currentRoute.name === "Main" && currentRoute.state) {
    const tabState = currentRoute.state;
    const activeTabRoute = tabState.routes[tabState.index];
    return activeTabRoute?.name || null;
  }
  const mainRoute = state.routes.find((r: any) => r.name === "Main");
  if (mainRoute?.state) {
    const tabState = mainRoute.state;
    const activeTabRoute = tabState.routes[tabState.index];
    return activeTabRoute?.name || null;
  }
  return null;
}

export function useIsWideWeb(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" && width > 768;
}

export default function WebSidebarLayout({ children }: { children: React.ReactNode }) {
  const isWideWeb = useIsWideWeb();
  const { isAuthenticated, user } = useAuth();
  const { hasCompletedOnboarding } = useOnboarding();

  const { requiresOnboarding } = useWorkerOnboarding();
  const showSidebar = isWideWeb && isAuthenticated && hasCompletedOnboarding && user && !user.mustChangePassword && !requiresOnboarding;

  if (!showSidebar) {
    return <>{children}</>;
  }

  return (
    <View style={layoutStyles.root}>
      <Sidebar />
      <View style={layoutStyles.content}>
        {children}
      </View>
    </View>
  );
}

function Sidebar() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation();
  const role = user?.role || "client";
  const tabs = TAB_ROUTES_BY_ROLE[role] || TAB_ROUTES_BY_ROLE.client;

  const navState = useNavigationState((state) => state);
  const activeTab = getActiveTabFromNavState(navState);

  const handleTabPress = (tabName: string) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: "Main",
        params: { screen: tabName },
      })
    );
  };

  return (
    <View
      style={[
        sidebarStyles.container,
        {
          backgroundColor: theme.backgroundDefault,
          borderRightColor: theme.border,
        },
      ]}
    >
      <View style={sidebarStyles.logoSection}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={sidebarStyles.logoImage}
          resizeMode="contain"
        />
        <ThemedText style={sidebarStyles.logoText}>WF Connect</ThemedText>
      </View>

      <View style={sidebarStyles.navSection}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.name;
          return (
            <Pressable
              key={tab.name}
              onPress={() => handleTabPress(tab.name)}
              style={({ pressed }) => [
                sidebarStyles.navItem,
                {
                  backgroundColor: isActive
                    ? theme.primary + "12"
                    : pressed
                      ? theme.primary + "08"
                      : "transparent",
                },
              ]}
            >
              <Feather
                name={tab.icon}
                size={18}
                color={isActive ? theme.primary : theme.textSecondary}
              />
              <ThemedText
                style={[
                  sidebarStyles.navLabel,
                  {
                    color: isActive ? theme.primary : theme.textSecondary,
                    fontWeight: isActive ? "600" : "400",
                  },
                ]}
              >
                {tab.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View
        style={[
          sidebarStyles.userSection,
          { borderTopColor: theme.border },
        ]}
      >
        <View
          style={[
            sidebarStyles.userAvatar,
            { backgroundColor: theme.primary + "20" },
          ]}
        >
          <Feather name="user" size={14} color={theme.primary} />
        </View>
        <View style={sidebarStyles.userInfo}>
          <ThemedText style={sidebarStyles.userName} numberOfLines={1}>
            {user?.fullName || "User"}
          </ThemedText>
          <ThemedText
            style={[sidebarStyles.userRole, { color: theme.textSecondary }]}
          >
            {user?.role
              ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
              : ""}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const layoutStyles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
  },
  content: {
    flex: 1,
  },
});

const sidebarStyles = StyleSheet.create({
  container: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    justifyContent: "flex-start",
  },
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  logoImage: {
    width: 28,
    height: 28,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  logoText: {
    fontSize: 14,
    fontWeight: "700",
  },
  navSection: {
    flex: 1,
    paddingHorizontal: Spacing.xs,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: 1,
    gap: Spacing.sm,
  },
  navLabel: {
    fontSize: 13,
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 12,
    fontWeight: "600",
  },
  userRole: {
    fontSize: 10,
  },
});
