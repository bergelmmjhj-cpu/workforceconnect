import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
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

interface BulletPointProps {
  children: string;
  bold?: boolean;
}

function BulletPoint({ children, bold }: BulletPointProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.bulletRow}>
      <ThemedText style={styles.bullet}>•</ThemedText>
      <ThemedText
        style={[
          styles.bulletText,
          bold && { fontWeight: "600", color: theme.text },
        ]}
      >
        {children}
      </ThemedText>
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
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const [readTerms, setReadTerms] = useState(false);
  const [agreeToSubcontractor, setAgreeToSubcontractor] = useState(false);

  const canProceed = readTerms && agreeToSubcontractor;

  const handleProceed = () => {
    if (canProceed) {
      rootNavigate("AgreementSigning");
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
              <Feather name="alert-triangle" size={24} color={theme.warning} />
            </View>
            <ThemedText style={[styles.warningTitle, { color: theme.warning }]}>
              IMPORTANT NOTICE
            </ThemedText>
          </View>
          <ThemedText style={styles.warningSubtitle}>
            Subcontractor Status & Payment Notice
          </ThemedText>
          <ThemedText style={styles.warningText}>
            Please read this section carefully before proceeding.
          </ThemedText>
        </Card>

        <ThemedText style={styles.introText}>
          All individuals providing services through Workforce Connect do so
          strictly as independent subcontractors, not as employees. By
          continuing, you acknowledge and agree to the terms below regarding
          your work status and payment.
        </ThemedText>

        <Section title="1. Work Status (Independent Subcontractor)">
          <ThemedText style={styles.sectionText}>
            All individuals providing services through Workforce Connect do so
            as independent subcontractors.
          </ThemedText>
          <ThemedText style={[styles.sectionText, styles.emphasizedText]}>
            This means:
          </ThemedText>
          <BulletPoint bold>You are NOT an employee</BulletPoint>
          <BulletPoint bold>You are NOT on payroll</BulletPoint>
          <BulletPoint>
            You invoice Workforce Connect based on completed and approved work
          </BulletPoint>

          <ThemedText style={[styles.sectionText, styles.emphasizedText]}>
            Because of this:
          </ThemedText>
          <BulletPoint bold>NO CPP deductions</BulletPoint>
          <BulletPoint bold>NO EI deductions</BulletPoint>
          <BulletPoint bold>NO income tax deductions</BulletPoint>

          <Card style={StyleSheet.flatten([styles.highlightCard, { backgroundColor: theme.warning + "15" }])}>
            <ThemedText style={styles.highlightText}>
              You are fully responsible for declaring your income and paying all
              applicable taxes to the Canada Revenue Agency (CRA).
            </ThemedText>
          </Card>
        </Section>

        <Section title="2. Pay Cycle & Release Timing">
          <ThemedText style={styles.sectionText}>
            Hotel-based work follows a bi-weekly reporting period.
          </ThemedText>
          <ThemedText style={[styles.sectionText, { fontWeight: "600" }]}>
            However, payment is NOT released based on calendar dates.
          </ThemedText>

          <ThemedText style={[styles.sectionText, styles.emphasizedText]}>
            Payments are issued only after:
          </ThemedText>
          <BulletPoint>
            Workforce Connect receives payment from the hotel or janitorial
            client
          </BulletPoint>

          <ThemedText style={styles.sectionText}>
            Once client funds are received and cleared, your payment will be
            processed and released immediately.
          </ThemedText>

          <ThemedText style={[styles.sectionText, styles.emphasizedText]}>
            Payment timing may vary depending on:
          </ThemedText>
          <BulletPoint>Client accounting schedules</BulletPoint>
          <BulletPoint>Bank settlement timelines</BulletPoint>
          <BulletPoint>Holidays</BulletPoint>
          <BulletPoint>System maintenance or operational delays</BulletPoint>

          <ThemedText style={styles.sectionText}>
            For transparency, proof of client payment may be requested for
            verification.
          </ThemedText>
        </Section>

        <Section title="3. How You Get Paid">
          <ThemedText style={styles.sectionText}>
            Workforce Connect supports ONLY the following payment methods:
          </ThemedText>

          <View style={styles.paymentMethod}>
            <ThemedText style={styles.paymentMethodTitle}>
              A. Direct Deposit (EFT)
            </ThemedText>
            <BulletPoint>Requires a valid void cheque</BulletPoint>
          </View>

          <View style={styles.paymentMethod}>
            <ThemedText style={styles.paymentMethodTitle}>
              B. Interac E-Transfer
            </ThemedText>
            <BulletPoint>Subject to bank-imposed sending limits</BulletPoint>
          </View>

          <View style={styles.paymentMethod}>
            <ThemedText style={styles.paymentMethodTitle}>
              C. Company Cheque
            </ThemedText>
            <BulletPoint>Available only to GTA-based subcontractors</BulletPoint>
          </View>
        </Section>

        <Section title="4. Submitting Your Payment Information">
          <ThemedText style={styles.sectionText}>
            You cannot be paid until your payment details are properly
            registered.
          </ThemedText>
          <ThemedText style={styles.sectionText}>
            Please complete the official Payment Information Form provided by
            Workforce Connect.
          </ThemedText>

          <Card style={StyleSheet.flatten([styles.highlightCard, { backgroundColor: theme.error + "15" }])}>
            <View style={styles.warningRow}>
              <Feather name="alert-circle" size={18} color={theme.error} />
              <ThemedText style={[styles.highlightText, { color: theme.error, marginLeft: Spacing.sm }]}>
                Incorrect or missing payment information will result in payment
                delays.
              </ThemedText>
            </View>
          </Card>
        </Section>

        <Card style={styles.acknowledgementCard}>
          <ThemedText style={styles.acknowledgementTitle}>
            ACKNOWLEDGEMENT & ACCEPTANCE
          </ThemedText>
          <ThemedText style={styles.acknowledgementText}>
            By clicking "I Agree", you confirm that:
          </ThemedText>
          <BulletPoint>
            You have read and understood the information above
          </BulletPoint>
          <BulletPoint>
            You acknowledge your independent subcontractor status
          </BulletPoint>
          <BulletPoint>
            You accept the payment structure and release conditions described
          </BulletPoint>
          <BulletPoint>
            You understand that no payroll deductions will be made
          </BulletPoint>
          <BulletPoint>
            You accept responsibility for your own tax reporting and remittances
          </BulletPoint>

          <View style={styles.checkboxContainer}>
            <CheckboxRow
              checked={readTerms}
              onToggle={() => setReadTerms(!readTerms)}
              label="I have read and understand the above terms"
            />
            <CheckboxRow
              checked={agreeToSubcontractor}
              onToggle={() => setAgreeToSubcontractor(!agreeToSubcontractor)}
              label="I agree to proceed as an independent subcontractor"
            />
          </View>
        </Card>

        <Button
          title="I AGREE"
          onPress={handleProceed}
          disabled={!canProceed}
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
