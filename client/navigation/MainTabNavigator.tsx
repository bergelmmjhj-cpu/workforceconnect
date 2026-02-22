import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";

import DashboardScreen from "@/screens/DashboardScreen";
import RequestsScreen from "@/screens/RequestsScreen";
import ShiftsScreen from "@/screens/ShiftsScreen";
import TitoScreen from "@/screens/TitoScreen";
import MessagesScreen from "@/screens/MessagesScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import WorkerCommunicationsScreen from "@/screens/WorkerCommunicationsScreen";
import UserManagementScreen from "@/screens/UserManagementScreen";
import AdminManageScreen from "@/screens/AdminManageScreen";
import ShiftRequestsScreen from "@/screens/ShiftRequestsScreen";
import ShiftOffersScreen from "@/screens/ShiftOffersScreen";
import NotificationsScreen from "@/screens/NotificationsScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";

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

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();

  const role = user?.role || "client";

  const getTabsForRole = () => {
    switch (role) {
      case "client":
        return (
          <>
            <Tab.Screen
              name="Dashboard"
              component={DashboardScreen}
              options={{
                headerTitle: () => <HeaderTitle title="Workforce Connect" />,
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
                  <Feather name="file-text" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Shifts"
              component={ShiftsScreen}
              options={{
                headerTitle: "Shifts",
                tabBarIcon: ({ color, size }) => (
                  <Feather name="calendar" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Messages"
              component={MessagesScreen}
              options={{
                headerTitle: "Messages",
                tabBarIcon: ({ color, size }) => (
                  <Feather name="message-circle" size={size} color={color} />
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
                headerTitle: () => <HeaderTitle title="Workforce Connect" />,
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
                  <Feather name="calendar" size={size} color={color} />
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
                headerTitle: () => <HeaderTitle title="Workforce Connect" />,
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
                  <Feather name="briefcase" size={size} color={color} />
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
                headerTitle: () => <HeaderTitle title="Workforce Connect" />,
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
                  <Feather name="briefcase" size={size} color={color} />
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
                  <Feather name="settings" size={size} color={color} />
                ),
              }}
            />
          </>
        );

      default:
        return null;
    }
  };

  const isWeb = Platform.OS === "web";

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
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
