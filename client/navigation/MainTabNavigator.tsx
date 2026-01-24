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
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type MainTabParamList = {
  Dashboard: undefined;
  Requests: undefined;
  Shifts: undefined;
  Tito: undefined;
  Messages: undefined;
  Profile: undefined;
  Users: undefined;
  Reports: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const screenOptions = useScreenOptions();

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
                title: "Time",
                headerTitle: "Time Tracking",
                tabBarIcon: ({ color, size }) => (
                  <Feather name="clock" size={size} color={color} />
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
              name="Requests"
              component={RequestsScreen}
              options={{
                headerTitle: "Requests",
                tabBarIcon: ({ color, size }) => (
                  <Feather name="inbox" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Tito"
              component={TitoScreen}
              options={{
                title: "TITO",
                headerTitle: "Time Review",
                tabBarIcon: ({ color, size }) => (
                  <Feather name="check-square" size={size} color={color} />
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
              name="Requests"
              component={RequestsScreen}
              options={{
                headerTitle: "All Requests",
                tabBarIcon: ({ color, size }) => (
                  <Feather name="file-text" size={size} color={color} />
                ),
              }}
            />
            <Tab.Screen
              name="Shifts"
              component={ShiftsScreen}
              options={{
                headerTitle: "All Shifts",
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

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        ...screenOptions,
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
