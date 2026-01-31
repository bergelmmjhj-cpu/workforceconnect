import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
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
import { Spacing, BorderRadius } from "@/constants/theme";
import { createAgreementAcceptance, createAgreementSubmission } from "@/storage";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getErrorMessage } from "@/utils/errorHandler";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface InitialsForm {
  s19_1: string;
  s19_2: string;
  s19_3: string;
  s19_4: string;
  s19_5: string;
}

const INITIAL_SECTIONS = [
  { key: "s19_1" as const, title: "A. Subcontractor Status (Not Employee)" },
  { key: "s19_2" as const, title: "B. Pay Structure & No Guaranteed Pay Date" },
  { key: "s19_3" as const, title: "C. TITO Accuracy & Verification" },
  { key: "s19_4" as const, title: "D. Confidentiality & Conduct" },
  { key: "s19_5" as const, title: "E. Termination Terms" },
];

export default function AgreementSigningScreen() {
  const { theme } = useTheme();
  const { user, updateOnboardingStatus } = useAuth();
  const { agreementTemplate, refreshOnboardingData } = useWorkerOnboarding();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();
  const scrollViewRef = useRef<ScrollView>(null);

  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [iAgree, setIAgree] = useState(false);
  const [acceptedFullName, setAcceptedFullName] = useState("");
  const [initials, setInitials] = useState<InitialsForm>({
    s19_1: "",
    s19_2: "",
    s19_3: "",
    s19_4: "",
    s19_5: "",
  });
  const [dateLocal, setDateLocal] = useState(new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 50;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      setHasScrolledToEnd(true);
    }
  };

  const handleSubmit = async () => {
    if (!user || !agreementTemplate) return;

    if (!hasScrolledToEnd) {
      Alert.alert("Please Read", "Please scroll to the end of the agreement to continue.");
      return;
    }

    if (!iAgree) {
      Alert.alert("Required", "Please check the 'I Agree' box to continue.");
      return;
    }

    if (!acceptedFullName.trim()) {
      Alert.alert("Required", "Please enter your full legal name.");
      return;
    }

    const missingInitials = INITIAL_SECTIONS.filter((s) => !initials[s.key].trim());
    if (missingInitials.length > 0) {
      Alert.alert(
        "Required",
        `Please provide your initials for: ${missingInitials.map((s) => s.title).join(", ")}`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const acceptance = await createAgreementAcceptance({
        workerId: user.id,
        templateId: agreementTemplate.id,
        templateVersion: agreementTemplate.version,
        templateBodySnapshot: agreementTemplate.bodyText,
        acceptedAtUtc: new Date().toISOString(),
        acceptedFullName: acceptedFullName.trim(),
        initials,
        dateLocal,
        timeZone: user.timezone || "America/Toronto",
      });

      await createAgreementSubmission({
        acceptanceId: acceptance.id,
        submittedToAdminAt: new Date().toISOString(),
        status: "submitted",
      });

      await updateOnboardingStatus("AGREEMENT_ACCEPTED");
      await refreshOnboardingData();

      Alert.alert(
        "Agreement Signed",
        "Thank you for signing the agreement. You now have full access to the app!",
        [{ text: "Continue", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert("Unable to Submit", getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCheckbox = (label: string, checked: boolean, onToggle: () => void) => (
    <Pressable style={styles.checkboxRow} onPress={onToggle}>
      <View
        style={[
          styles.checkbox,
          { borderColor: theme.border },
          checked && { backgroundColor: theme.primary, borderColor: theme.primary },
        ]}
      >
        {checked ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
      </View>
      <ThemedText style={styles.checkboxLabel}>{label}</ThemedText>
    </Pressable>
  );

  if (!agreementTemplate) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText>Loading agreement template...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={true}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Feather name="info" size={20} color={theme.primary} />
            <ThemedText style={[styles.infoText, { color: theme.textSecondary }]}>
              Please read the entire agreement and provide your signature and initials to continue.
            </ThemedText>
          </View>
        </Card>

        <Card style={styles.agreementCard}>
          <View style={styles.agreementHeader}>
            <ThemedText style={styles.agreementTitle}>{agreementTemplate.title}</ThemedText>
            <ThemedText style={[styles.agreementVersion, { color: theme.textSecondary }]}>
              Version {agreementTemplate.version} | Effective{" "}
              {new Date(agreementTemplate.effectiveDate).toLocaleDateString()}
            </ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <ThemedText style={styles.agreementBody}>{agreementTemplate.bodyText}</ThemedText>
        </Card>

        {hasScrolledToEnd ? (
          <Card style={styles.signatureCard}>
            <ThemedText style={styles.signatureTitle}>Signature & Acceptance</ThemedText>

            {renderCheckbox(
              "I have read and agree to the terms of this Subcontractor Agreement",
              iAgree,
              () => setIAgree(!iAgree)
            )}

            <View style={styles.inputGroup}>
              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Full Legal Name <ThemedText style={{ color: theme.error }}>*</ThemedText>
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={acceptedFullName}
                onChangeText={setAcceptedFullName}
                placeholder="Type your full legal name"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <ThemedText style={[styles.subsectionTitle, { color: theme.text }]}>
              Required Initials
            </ThemedText>
            <ThemedText style={[styles.initialsDescription, { color: theme.textSecondary }]}>
              Please provide your initials for each of the following sections to confirm your
              understanding:
            </ThemedText>

            {INITIAL_SECTIONS.map((section) => (
              <View key={section.key} style={styles.initialRow}>
                <View style={styles.initialLabelContainer}>
                  <ThemedText style={styles.initialLabel}>{section.title}</ThemedText>
                </View>
                <TextInput
                  style={[
                    styles.initialInput,
                    {
                      backgroundColor: theme.inputBackground,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  value={initials[section.key]}
                  onChangeText={(v) => setInitials((prev) => ({ ...prev, [section.key]: v }))}
                  placeholder="Initials"
                  placeholderTextColor={theme.textSecondary}
                  maxLength={5}
                  autoCapitalize="characters"
                />
              </View>
            ))}

            <View style={styles.inputGroup}>
              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Date <ThemedText style={{ color: theme.error }}>*</ThemedText>
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.inputBackground,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                value={dateLocal}
                onChangeText={setDateLocal}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <Button
              title={isSubmitting ? "Submitting..." : "Sign Agreement"}
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={styles.submitButton}
            />
          </Card>
        ) : (
          <Card style={styles.scrollPrompt}>
            <Feather name="arrow-down" size={24} color={theme.primary} />
            <ThemedText style={{ color: theme.textSecondary, textAlign: "center" }}>
              Please scroll to the end of the agreement to continue with signing.
            </ThemedText>
          </Card>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  infoCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  agreementCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  agreementHeader: {
    marginBottom: Spacing.md,
  },
  agreementTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  agreementVersion: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  agreementBody: {
    fontSize: 14,
    lineHeight: 22,
  },
  signatureCard: {
    padding: Spacing.lg,
  },
  signatureTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  inputGroup: {
    marginTop: Spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  initialsDescription: {
    fontSize: 13,
    marginBottom: Spacing.md,
  },
  initialRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  initialLabelContainer: {
    flex: 1,
  },
  initialLabel: {
    fontSize: 14,
  },
  initialInput: {
    width: 80,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: 14,
    textAlign: "center",
  },
  submitButton: {
    marginTop: Spacing.xl,
  },
  scrollPrompt: {
    padding: Spacing.lg,
    alignItems: "center",
    gap: Spacing.sm,
  },
});
