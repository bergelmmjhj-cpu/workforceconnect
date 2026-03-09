import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import LoginScreen from "@/screens/LoginScreen";
import SignUpScreen from "@/screens/SignUpScreen";
import OnboardingScreen from "@/screens/OnboardingScreen";
import CreateRequestScreen from "@/screens/CreateRequestScreen";
import RequestDetailScreen from "@/screens/RequestDetailScreen";
import ShiftDetailScreen from "@/screens/ShiftDetailScreen";
import ClockInOutScreen from "@/screens/ClockInOutScreen";
import WorkerOnboardingScreen from "@/screens/WorkerOnboardingScreen";
import WorkerApplicationFormScreen from "@/screens/WorkerApplicationFormScreen";
import AgreementSigningScreen from "@/screens/AgreementSigningScreen";
import SubcontractorNoticeScreen from "@/screens/SubcontractorNoticeScreen";
import CommunicationsChatScreen from "@/screens/CommunicationsChatScreen";
import AdminManageScreen from "@/screens/AdminManageScreen";
import WorkplacesListScreen from "@/screens/WorkplacesListScreen";
import WorkplaceDetailScreen from "@/screens/WorkplaceDetailScreen";
import WorkplaceEditScreen from "@/screens/WorkplaceEditScreen";
import WorkerDirectoryScreen from "@/screens/WorkerDirectoryScreen";
import InviteWorkerScreen from "@/screens/InviteWorkerScreen";
import AssignToWorkplaceScreen from "@/screens/AssignToWorkplaceScreen";
import TitoLogsAdminScreen from "@/screens/TitoLogsAdminScreen";
import ApplicationsAdminScreen from "@/screens/ApplicationsAdminScreen";
import CrmSyncScreen from "@/screens/CrmSyncScreen";
import DiagnosticsScreen from "@/screens/DiagnosticsScreen";
import RosterScreen from "@/screens/RosterScreen";
import TwoFactorVerifyScreen from "@/screens/TwoFactorVerifyScreen";
import ChangePasswordScreen from "@/screens/ChangePasswordScreen";
import ForgotPasswordScreen from "@/screens/ForgotPasswordScreen";
import ResetPasswordScreen from "@/screens/ResetPasswordScreen";
import UserManagementScreen from "@/screens/UserManagementScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { useWorkerOnboarding } from "@/contexts/WorkerOnboardingContext";
import { useTheme } from "@/hooks/useTheme";
import { useNotifications } from "@/hooks/useNotifications";

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  SignUp: undefined;
  TwoFactorVerify: { userId: string };
  Main: undefined;
  CreateRequest: undefined;
  RequestDetail: { requestId: string };
  ShiftDetail: { shiftId: string };
  ClockInOut: { shiftId: string };
  WorkerOnboarding: undefined;
  WorkerApplication: undefined;
  SubcontractorNotice: undefined;
  AgreementSigning: undefined;
  CommunicationsChat: { conversationId: string };
  AdminManage: undefined;
  WorkplacesList: undefined;
  WorkplaceDetail: { workplaceId: string };
  Roster: { workplaceId: string; workplaceName: string };
  WorkplaceEdit: { workplaceId?: string };
  WorkerDirectory: undefined;
  InviteWorker: { workplaceId: string };
  AssignToWorkplace: { workerId: string; workerName: string };
  TitoLogsAdmin: undefined;
  ApplicationsAdmin: undefined;
  CrmSync: undefined;
  Diagnostics: undefined;
  ChangePassword: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  UserManagement: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { hasCompletedOnboarding, isLoading: onboardingLoading } = useOnboarding();
  const { requiresOnboarding, isLoading: workerOnboardingLoading } = useWorkerOnboarding();
  const { theme } = useTheme();
  useNotifications();

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
          <Stack.Screen
            name="TwoFactorVerify"
            component={TwoFactorVerifyScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : user?.mustChangePassword ? (
        <Stack.Screen
          name="ChangePassword"
          component={ChangePasswordScreen}
          options={{ headerShown: false }}
        />
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
            name="CommunicationsChat"
            component={CommunicationsChatScreen}
            options={{
              headerTitle: "Conversation",
              headerTransparent: false,
              headerBlurEffect: undefined,
            }}
          />
          <Stack.Screen
            name="AdminManage"
            component={AdminManageScreen}
            options={{
              headerTitle: "Management",
            }}
          />
          <Stack.Screen
            name="WorkplacesList"
            component={WorkplacesListScreen}
            options={{
              headerTitle: "Workplaces",
            }}
          />
          <Stack.Screen
            name="WorkplaceDetail"
            component={WorkplaceDetailScreen}
            options={{
              headerTitle: "Workplace",
            }}
          />
          <Stack.Screen
            name="Roster"
            component={RosterScreen}
            options={{ headerTitle: "Roster View" }}
          />
          <Stack.Screen
            name="WorkplaceEdit"
            component={WorkplaceEditScreen}
            options={({ route }) => ({
              headerTitle: route.params?.workplaceId ? "Edit Workplace" : "New Workplace",
            })}
          />
          <Stack.Screen
            name="WorkerDirectory"
            component={WorkerDirectoryScreen}
            options={{
              headerTitle: "Worker Directory",
            }}
          />
          <Stack.Screen
            name="InviteWorker"
            component={InviteWorkerScreen}
            options={{
              headerTitle: "Add Worker",
            }}
          />
          <Stack.Screen
            name="AssignToWorkplace"
            component={AssignToWorkplaceScreen}
            options={{
              headerTitle: "Assign to Workplace",
            }}
          />
          <Stack.Screen
            name="TitoLogsAdmin"
            component={TitoLogsAdminScreen}
            options={{
              headerTitle: "TITO Logs",
            }}
          />
          <Stack.Screen
            name="ApplicationsAdmin"
            component={ApplicationsAdminScreen}
            options={{
              headerTitle: "Applications",
            }}
          />
          <Stack.Screen
            name="CrmSync"
            component={CrmSyncScreen}
            options={{
              headerTitle: "CRM Sync",
            }}
          />
          <Stack.Screen
            name="Diagnostics"
            component={DiagnosticsScreen}
            options={{
              headerTitle: "Diagnostics",
            }}
          />
          <Stack.Screen
            name="UserManagement"
            component={UserManagementScreen}
            options={{
              headerTitle: "User Management",
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
