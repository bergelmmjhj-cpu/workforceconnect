import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkerOnboarding } from "@/contexts/WorkerOnboardingContext";
import { Spacing } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  status: "completed" | "current" | "pending";
}

export default function WorkerOnboardingScreen() {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const { onboardingStatus, isLoading } = useWorkerOnboarding();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();

  const getSteps = (): OnboardingStep[] => {
    const status = onboardingStatus;

    const applicationCompleted = [
      "APPLICATION_SUBMITTED",
      "APPLICATION_APPROVED",
      "AGREEMENT_PENDING",
      "AGREEMENT_ACCEPTED",
      "ONBOARDED",
    ].includes(status);

    const approvalCompleted = [
      "APPLICATION_APPROVED",
      "AGREEMENT_PENDING",
      "AGREEMENT_ACCEPTED",
      "ONBOARDED",
    ].includes(status);

    const agreementCompleted = ["AGREEMENT_ACCEPTED", "ONBOARDED"].includes(status);

    return [
      {
        id: "application",
        title: "Complete Application",
        description: "Fill out your worker application form",
        icon: "file-text",
        status: applicationCompleted
          ? "completed"
          : status === "NOT_APPLIED"
          ? "current"
          : "pending",
      },
      {
        id: "approval",
        title: "Application Review",
        description: "Wait for HR/Admin to review your application",
        icon: "check-circle",
        status: approvalCompleted
          ? "completed"
          : status === "APPLICATION_SUBMITTED"
          ? "current"
          : status === "APPLICATION_REJECTED"
          ? "pending"
          : "pending",
      },
      {
        id: "agreement",
        title: "Sign Agreement",
        description: "Review and sign the subcontractor agreement",
        icon: "edit-3",
        status: agreementCompleted
          ? "completed"
          : status === "AGREEMENT_PENDING"
          ? "current"
          : "pending",
      },
      {
        id: "complete",
        title: "Start Working",
        description: "Access your shifts and start earning",
        icon: "briefcase",
        status: agreementCompleted ? "completed" : "pending",
      },
    ];
  };

  const steps = getSteps();

  const getStatusMessage = () => {
    switch (onboardingStatus) {
      case "NOT_APPLIED":
        return "Welcome! Complete your application to get started.";
      case "APPLICATION_SUBMITTED":
        return "Your application is under review. We'll notify you once it's processed.";
      case "APPLICATION_REJECTED":
        return "Unfortunately, your application was not approved. Please contact support for more information.";
      case "AGREEMENT_PENDING":
        return "Great news! Your application was approved. Please sign the agreement to continue.";
      case "AGREEMENT_ACCEPTED":
      case "ONBOARDED":
        return "You're all set! Welcome to the team.";
      default:
        return "";
    }
  };

  const getActionButton = () => {
    switch (onboardingStatus) {
      case "NOT_APPLIED":
        return (
          <Button
            title="Start Application"
            onPress={() => navigation.navigate("WorkerApplication" as any)}
            style={styles.actionButton}
          />
        );
      case "AGREEMENT_PENDING":
        return (
          <Button
            title="Sign Agreement"
            onPress={() => navigation.navigate("AgreementSigning" as any)}
            style={styles.actionButton}
          />
        );
      case "APPLICATION_REJECTED":
        return (
          <Button
            title="Contact Support"
            variant="secondary"
            onPress={() => {}}
            style={styles.actionButton}
          />
        );
      default:
        return null;
    }
  };

  const renderStep = (step: OnboardingStep, index: number) => {
    const isLast = index === steps.length - 1;

    return (
      <View key={step.id} style={styles.stepContainer}>
        <View style={styles.stepIndicator}>
          <View
            style={[
              styles.stepCircle,
              {
                backgroundColor:
                  step.status === "completed"
                    ? theme.success
                    : step.status === "current"
                    ? theme.primary
                    : theme.border,
              },
            ]}
          >
            {step.status === "completed" ? (
              <Feather name="check" size={16} color="#FFFFFF" />
            ) : (
              <Feather
                name={step.icon}
                size={16}
                color={step.status === "current" ? "#FFFFFF" : theme.textSecondary}
              />
            )}
          </View>
          {!isLast ? (
            <View
              style={[
                styles.stepLine,
                {
                  backgroundColor:
                    step.status === "completed" ? theme.success : theme.border,
                },
              ]}
            />
          ) : null}
        </View>
        <View style={styles.stepContent}>
          <ThemedText
            style={[
              styles.stepTitle,
              {
                color:
                  step.status === "completed" || step.status === "current"
                    ? theme.text
                    : theme.textSecondary,
              },
            ]}
          >
            {step.title}
          </ThemedText>
          <ThemedText style={[styles.stepDescription, { color: theme.textSecondary }]}>
            {step.description}
          </ThemedText>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.xl, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText style={styles.welcomeText}>Welcome, {user?.fullName}</ThemedText>
          <ThemedText style={[styles.title, { color: theme.text }]}>
            Worker Onboarding
          </ThemedText>
        </View>

        <Card style={styles.statusCard}>
          <View style={styles.statusContent}>
            <Feather
              name={
                onboardingStatus === "APPLICATION_REJECTED"
                  ? "alert-circle"
                  : onboardingStatus === "AGREEMENT_ACCEPTED" || onboardingStatus === "ONBOARDED"
                  ? "check-circle"
                  : "info"
              }
              size={24}
              color={
                onboardingStatus === "APPLICATION_REJECTED"
                  ? theme.error
                  : onboardingStatus === "AGREEMENT_ACCEPTED" || onboardingStatus === "ONBOARDED"
                  ? theme.success
                  : theme.primary
              }
            />
            <ThemedText style={[styles.statusMessage, { color: theme.text }]}>
              {getStatusMessage()}
            </ThemedText>
          </View>
        </Card>

        <Card style={styles.stepsCard}>
          <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>
            Your Progress
          </ThemedText>
          <View style={styles.stepsList}>{steps.map(renderStep)}</View>
        </Card>

        {getActionButton()}

        <Button
          title="Sign Out"
          variant="secondary"
          onPress={logout}
          style={styles.logoutButton}
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  welcomeText: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  statusCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  statusContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  statusMessage: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  stepsCard: {
    marginBottom: Spacing.xl,
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.lg,
  },
  stepsList: {
    gap: 0,
  },
  stepContainer: {
    flexDirection: "row",
  },
  stepIndicator: {
    alignItems: "center",
    marginRight: Spacing.md,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: 32,
    marginVertical: 4,
  },
  stepContent: {
    flex: 1,
    paddingBottom: Spacing.lg,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
  },
  actionButton: {
    marginBottom: Spacing.md,
  },
  logoutButton: {
    marginTop: Spacing.md,
  },
});
