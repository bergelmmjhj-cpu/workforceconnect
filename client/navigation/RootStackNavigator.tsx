import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import LoginScreen from "@/screens/LoginScreen";
import SignUpScreen from "@/screens/SignUpScreen";
import OnboardingScreen from "@/screens/OnboardingScreen";
import ChatScreen from "@/screens/ChatScreen";
import CreateRequestScreen from "@/screens/CreateRequestScreen";
import RequestDetailScreen from "@/screens/RequestDetailScreen";
import ShiftDetailScreen from "@/screens/ShiftDetailScreen";
import ClockInOutScreen from "@/screens/ClockInOutScreen";
import WorkerOnboardingScreen from "@/screens/WorkerOnboardingScreen";
import WorkerApplicationFormScreen from "@/screens/WorkerApplicationFormScreen";
import AgreementSigningScreen from "@/screens/AgreementSigningScreen";
import SubcontractorNoticeScreen from "@/screens/SubcontractorNoticeScreen";
import QuoChatScreen from "@/screens/QuoChatScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useWorkerOnboarding } from "@/contexts/WorkerOnboardingContext";
import { useTheme } from "@/hooks/useTheme";

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  SignUp: undefined;
  Main: undefined;
  ChatScreen: { conversationId: string };
  CreateRequest: undefined;
  RequestDetail: { requestId: string };
  ShiftDetail: { shiftId: string };
  ClockInOut: { shiftId: string };
  WorkerOnboarding: undefined;
  WorkerApplication: undefined;
  SubcontractorNotice: undefined;
  AgreementSigning: undefined;
  QuoChat: { conversationId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { hasCompletedOnboarding, isLoading: onboardingLoading } = useOnboarding();
  const { requiresOnboarding, isLoading: workerOnboardingLoading } = useWorkerOnboarding();
  const { theme } = useTheme();

  if (authLoading || onboardingLoading || (isAuthenticated && workerOnboardingLoading)) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.backgroundRoot,
        }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!hasCompletedOnboarding ? (
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
      ) : !isAuthenticated ? (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="SignUp"
            component={SignUpScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : requiresOnboarding ? (
        <>
          <Stack.Screen
            name="WorkerOnboarding"
            component={WorkerOnboardingScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="WorkerApplication"
            component={WorkerApplicationFormScreen}
            options={{
              headerTitle: "Worker Application",
            }}
          />
          <Stack.Screen
            name="SubcontractorNotice"
            component={SubcontractorNoticeScreen}
            options={{
              headerTitle: "Important Notice",
            }}
          />
          <Stack.Screen
            name="AgreementSigning"
            component={AgreementSigningScreen}
            options={{
              headerTitle: "Sign Agreement",
            }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ChatScreen"
            component={ChatScreen}
            options={{
              headerTitle: "Chat",
            }}
          />
          <Stack.Screen
            name="CreateRequest"
            component={CreateRequestScreen}
            options={{
              presentation: "modal",
              headerTitle: "New Request",
            }}
          />
          <Stack.Screen
            name="RequestDetail"
            component={RequestDetailScreen}
            options={{
              headerTitle: "Request Details",
            }}
          />
          <Stack.Screen
            name="ShiftDetail"
            component={ShiftDetailScreen}
            options={{
              headerTitle: "Shift Details",
            }}
          />
          <Stack.Screen
            name="ClockInOut"
            component={ClockInOutScreen}
            options={{
              headerTitle: "Clock In/Out",
            }}
          />
          <Stack.Screen
            name="QuoChat"
            component={QuoChatScreen}
            options={{
              headerTitle: "Conversation",
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
