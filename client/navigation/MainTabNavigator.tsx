import React from "react";
import {
  createBottomTabNavigator,
  BottomTabBarProps,
} from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import {
  Platform,
  StyleSheet,
  View,
  Image,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { BottomTabBar } from "@react-navigation/bottom-tabs";

import DashboardScreen from "@/screens/DashboardScreen";
import RequestsScreen from "@/screens/RequestsScreen";
import ShiftsScreen from "@/screens/ShiftsScreen";
import TitoScreen from "@/screens/TitoScreen";
import MessagesScreen from "@/screens/MessagesScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import AdminManageScreen from "@/screens/AdminManageScreen";
import ShiftRequestsScreen from "@/screens/ShiftRequestsScreen";
import ShiftOffersScreen from "@/screens/ShiftOffersScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";

export type MainTabParamList = {
  Dashboard: undefined;
  Requests: undefined;
  ShiftRequests: undefined;
  ShiftOffers: undefined;
  Shifts: undefined;
  Tito: undefined;
  Messages: undefined;
  Notifications: undefined;
  Profile: undefined;
  Users: undefined;
  Reports: undefined;
  Communications: undefined;
  Management: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const SIDEBAR_WIDTH = 240;

const SIDEBAR_NAV_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  Dashboard: "home",
  Requests: "file-text",
  ShiftRequests: "send",
  ShiftOffers: "inbox",
  Shifts: "calendar",
  Tito: "clock",
  Messages: "message-circle",
  Notifications: "bell",
  Profile: "user",
  Users: "users",
  Management: "briefcase",
  Communications: "phone",
  Reports: "bar-chart-2",
};

function WebSidebarTabBar(props: BottomTabBarProps) {
  const { state, navigation, descriptors } = props;
  const { theme } = useTheme();
  const { user } = useAuth();

  return (
    <View
      style={[
        sidebarStyles.absoluteContainer,
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
        <ThemedText style={sidebarStyles.logoText}>
          Workforce Connect
        </ThemedText>
      </View>

      <View style={sidebarStyles.navSection}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            typeof options.title === "string"
              ? options.title
              : route.name;
          const isActive = state.index === index;
          const iconName =
            SIDEBAR_NAV_ICONS[route.name] || "circle";

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isActive && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
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
                name={iconName}
                size={20}
                color={
                  isActive ? theme.primary : theme.textSecondary
                }
              />
              <ThemedText
                style={[
                  sidebarStyles.navLabel,
                  {
                    color: isActive
                      ? theme.primary
                      : theme.textSecondary,
                    fontWeight: isActive ? "600" : "400",
                  },
                ]}
              >
                {label}
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
          <Feather name="user" size={16} color={theme.primary} />
        </View>
        <View style={sidebarStyles.userInfo}>
          <ThemedText
            style={sidebarStyles.userName}
            numberOfLines={1}
          >
            {user?.fullName || "User"}
          </ThemedText>
          <ThemedText
            style={[
              sidebarStyles.userRole,
              { color: theme.textSecondary },
            ]}
          >
            {user?.role
              ? user.role.charAt(0).toUpperCase() +
                user.role.slice(1)
              : ""}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

function CustomTabBar(props: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const isWideWeb = Platform.OS === "web" && width > 768;

  if (isWideWeb) {
    return <WebSidebarTabBar {...props} />;
  }

  return <BottomTabBar {...props} />;
}

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();

  const role = user?.role || "client";
  const isWeb = Platform.OS === "web";
  const isWideWeb = isWeb && width > 768;

  const getTabsForRole = () => {
    switch (role) {
      case "client":
        return (
          <>
            <Tab.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{
                headerTitle: () => (
                  <HeaderTitle title="Workforce Connect" />
                ),
                tabBarIcon: ({ color, size }) => (
                  <Feather name="home" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Requests"
              component={RequestsScreen}
              options={{
                headerTitle: "Requests",
                tabBarIcon: ({ color, size }) => (
                  <Feather
                    name="file-text"
                    size={size}
                    color={color}
                  />
                ),
              }}
            />
            <Tab.Screen
              name="Shifts"
              component={ShiftsScreen}
              options={{
                headerTitle: "Shifts",
                tabBarIcon: ({ color, size }) => (
                  <Feather
                    name="calendar"
                    size={size}
                    color={color}
                  />
                ),
              }}
            />
            <Tab.Screen
              name="Messages"
              component={MessagesScreen}
              options={{
                headerTitle: "Messages",
                tabBarIcon: ({ color, size }) => (
                  <Feather
                    name="message-circle"
                    size={size}
                    color={color}
                  />
                ),
              }}
            />
            <Tab.Screen
              name="Profile"
              component={ProfileScreen}
              options={{
                headerTitle: "Account",
                tabBarIcon: ({ color, size }) => (
                  <Feather name="user" size={size} color={color} />
                ),
              }}
            />
          </>
        );

      case "worker":
        return (
          <>
            <Tab.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{
                headerTitle: () => (
                  <HeaderTitle title="Workforce Connect" />
                ),
                tabBarIcon: ({ color, size }) => (
                  <Feather name="home" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="ShiftOffers"
              component={ShiftOffersScreen}
              options={{
                title: "Offers",
                headerTitle: "Shift Offers",
                tabBarIcon: ({ color, size }) => (
                  <Feather name="inbox" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Shifts"
              component={ShiftsScreen}
              options={{
                headerTitle: "My Shifts",
                tabBarIcon: ({ color, size }) => (
                  <Feather
                    name="calendar"
                    size={size}
                    color={color}
                  />
                ),
              }}
            />
            <Tab.Screen
              name="Tito"
              component={TitoScreen}
              options={{
                headerTitle: "TITO Logs",
                tabBarIcon: ({ color, size }) => (
                  <Feather name="clock" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Profile"
              component={ProfileScreen}
              options={{
                headerTitle: "Account",
                tabBarIcon: ({ color, size }) => (
                  <Feather name="user" size={size} color={color} />
                ),
              }}
            />
          </>
        );

      case "hr":
        return (
          <>
            <Tab.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{
                headerTitle: () => (
                  <HeaderTitle title="Workforce Connect" />
                ),
                tabBarIcon: ({ color, size }) => (
                  <Feather name="home" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="ShiftRequests"
              component={ShiftRequestsScreen}
              options={{
                title: "Requests",
                headerTitle: "Shift Requests",
                tabBarIcon: ({ color, size }) => (
                  <Feather name="send" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Management"
              component={AdminManageScreen}
              options={{
                headerTitle: "Management",
                tabBarIcon: ({ color, size }) => (
                  <Feather
                    name="briefcase"
                    size={size}
                    color={color}
                  />
                ),
              }}
            />
            <Tab.Screen
              name="Tito"
              component={TitoScreen}
              options={{
                headerTitle: "TITO Logs",
                tabBarIcon: ({ color, size }) => (
                  <Feather name="clock" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Profile"
              component={ProfileScreen}
              options={{
                headerTitle: "Account",
                tabBarIcon: ({ color, size }) => (
                  <Feather name="user" size={size} color={color} />
                ),
              }}
            />
          </>
        );

      case "admin":
        return (
          <>
            <Tab.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{
                headerTitle: () => (
                  <HeaderTitle title="Workforce Connect" />
                ),
                tabBarIcon: ({ color, size }) => (
                  <Feather name="home" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="ShiftRequests"
              component={ShiftRequestsScreen}
              options={{
                title: "Requests",
                headerTitle: "Shift Requests",
                tabBarIcon: ({ color, size }) => (
                  <Feather name="send" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Management"
              component={AdminManageScreen}
              options={{
                headerTitle: "Management",
                tabBarIcon: ({ color, size }) => (
                  <Feather
                    name="briefcase"
                    size={size}
                    color={color}
                  />
                ),
              }}
            />
            <Tab.Screen
              name="Tito"
              component={TitoScreen}
              options={{
                headerTitle: "TITO Logs",
                tabBarIcon: ({ color, size }) => (
                  <Feather name="clock" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Profile"
              component={ProfileScreen}
              options={{
                headerTitle: "Settings",
                tabBarIcon: ({ color, size }) => (
                  <Feather
                    name="settings"
                    size={size}
                    color={color}
                  />
                ),
              }}
            />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      tabBar={(props) => <CustomTabBar {...props} />}
      sceneContainerStyle={
        isWideWeb
          ? { marginLeft: SIDEBAR_WIDTH }
          : undefined
      }
      screenOptions={{
        headerTitleAlign: "center",
        headerTransparent: !isWeb,
        headerBlurEffect: isDark ? "dark" : "light",
        headerTintColor: theme.text,
        headerStyle: {
          backgroundColor: isWeb ? theme.backgroundRoot : undefined,
        },
        tabBarActiveTintColor: theme.tabIconSelected,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundRoot,
            web: theme.backgroundRoot,
          }),
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
      }}
    >
      {getTabsForRole()}
    </Tab.Navigator>
  );
}

const sidebarStyles = StyleSheet.create({
  absoluteContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    justifyContent: "flex-start",
    zIndex: 10,
  },
  logoSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginRight: Spacing.sm,
  },
  logoText: {
    fontSize: 15,
    fontWeight: "700",
  },
  navSection: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: 2,
    gap: Spacing.md,
  },
  navLabel: {
    fontSize: 14,
  },
  userSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: "600",
  },
  userRole: {
    fontSize: 11,
  },
});
