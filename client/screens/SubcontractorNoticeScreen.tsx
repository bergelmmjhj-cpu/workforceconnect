import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { rootNavigate } from "@/lib/navigation";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkerOnboarding } from "@/contexts/WorkerOnboardingContext";
import { acknowledgeWorkerNonSolicitation } from "@/storage";
import { apiRequest } from "@/lib/query-client";
import {
  NON_SOLICITATION_DIRECT_HIRING_CLAUSE_PARAGRAPHS,
  NON_SOLICITATION_DIRECT_HIRING_CLAUSE_TITLE,
  WORKFORCE_SUBCONTRACTOR_AGREEMENT_VERSION,
} from "../../shared/contractor-guide-content";

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionTitle, { color: theme.primary }]}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

interface CheckboxRowProps {
  checked: boolean;
  onToggle: () => void;
  label: string;
}

function CheckboxRow({ checked, onToggle, label }: CheckboxRowProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      style={styles.checkboxRow}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: checked ? theme.primary : theme.border,
            backgroundColor: checked ? theme.primary : "transparent",
          },
        ]}
      >
        {checked ? (
          <Feather name="check" size={16} color={theme.backgroundRoot} />
        ) : null}
      </View>
      <ThemedText style={styles.checkboxLabel}>{label}</ThemedText>
    </Pressable>
  );
}

export default function SubcontractorNoticeScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { refreshOnboardingData } = useWorkerOnboarding();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const [agreeToClause, setAgreeToClause] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canProceed = agreeToClause;

  const handleProceed = async () => {
    if (!canProceed || !user) {
      return;
    }

    try {
      setIsSaving(true);
      await acknowledgeWorkerNonSolicitation(user.id, WORKFORCE_SUBCONTRACTOR_AGREEMENT_VERSION);
      await refreshOnboardingData();

      try {
        await apiRequest("PATCH", "/api/agreements/me/non-solicitation", {});
      } catch (syncError) {
        console.error("Failed to sync non-solicitation acknowledgment:", syncError);
      }

      rootNavigate("AgreementSigning");
    } catch (error) {
      Alert.alert("Unable to continue", "The clause acknowledgment could not be saved. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <View
              style={[
                styles.warningIconContainer,
                { backgroundColor: theme.warning + "20" },
              ]}
            >
              <Feather name="shield" size={22} color={theme.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.warningTitle, { color: theme.warning }]}> 
                Clause Acknowledgment Required
              </ThemedText>
              <ThemedText style={styles.warningSubtitle}>
                {NON_SOLICITATION_DIRECT_HIRING_CLAUSE_TITLE}
              </ThemedText>
            </View>
          </View>
          <ThemedText style={styles.warningText}>
            This acknowledgment must be completed before you can finish signing your worker agreement.
          </ThemedText>
        </Card>

        <ThemedText style={styles.introText}>
          Review the exact clause below. The worker-facing PDF, internal company copy, and public web flow all use the same wording.
        </ThemedText>

        <Section title={NON_SOLICITATION_DIRECT_HIRING_CLAUSE_TITLE}>
          {NON_SOLICITATION_DIRECT_HIRING_CLAUSE_PARAGRAPHS.map((paragraph) => (
            <ThemedText key={paragraph} style={styles.sectionText}>
              {paragraph}
            </ThemedText>
          ))}
        </Section>

        <Card style={styles.acknowledgementCard}>
          <ThemedText style={styles.acknowledgementTitle}>Acknowledgment</ThemedText>
          <ThemedText style={styles.acknowledgementText}>
            Final agreement signing remains locked until you accept this clause.
          </ThemedText>
          <View style={styles.checkboxContainer}>
            <CheckboxRow
              checked={agreeToClause}
              onToggle={() => setAgreeToClause(!agreeToClause)}
              label="I have read and agree to the Non-Solicitation / Direct Hiring Clause."
            />
          </View>
        </Card>

        <Button
          title={isSaving ? "Saving..." : "Continue to Agreement"}
          onPress={handleProceed}
          disabled={!canProceed || isSaving}
          style={styles.agreeButton}
        />
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
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  warningCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  warningIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  warningSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  warningText: {
    fontSize: 14,
    opacity: 0.8,
  },
  introText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  emphasizedText: {
    marginTop: Spacing.md,
    fontWeight: "500",
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: Spacing.xs,
    paddingLeft: Spacing.sm,
  },
  bullet: {
    marginRight: Spacing.sm,
    fontSize: 15,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  highlightCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  highlightText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    flex: 1,
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  paymentMethod: {
    marginBottom: Spacing.md,
  },
  paymentMethodTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  acknowledgementCard: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  acknowledgementTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: Spacing.md,
  },
  acknowledgementText: {
    fontSize: 15,
    marginBottom: Spacing.md,
  },
  checkboxContainer: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  agreeButton: {
    marginBottom: Spacing.lg,
  },
});
