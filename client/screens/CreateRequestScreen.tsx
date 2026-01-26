import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { addHours, format } from "date-fns";

import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { createRequest } from "@/storage";
import { WORKER_ROLES, WorkerRole } from "@/types";

export default function CreateRequestScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roleNeeded, setRoleNeeded] = useState<WorkerRole | "">("");
  const [location, setLocation] = useState("");
  const [payStructure, setPayStructure] = useState("");
  const [notes, setNotes] = useState("");

  const isValid = roleNeeded && location.trim();

  const handleSubmit = async () => {
    if (!isValid || !user) return;

    setIsSubmitting(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const now = new Date();
      const startTime = addHours(now, 24);
      const endTime = addHours(startTime, 8);
      const slaDeadline = addHours(now, 12);

      await createRequest({
        clientId: user.id,
        clientName: user.fullName,
        roleNeeded: roleNeeded as WorkerRole,
        shiftStartTime: startTime.toISOString(),
        shiftEndTime: endTime.toISOString(),
        locationMajorIntersection: location,
        payStructure: payStructure || "To be discussed",
        notes: notes,
        status: "submitted",
        slaDeadline: slaDeadline.toISOString(),
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (error) {
      console.error("Failed to create request:", error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Role Needed
        </ThemedText>
        <View style={styles.roleGrid}>
          {WORKER_ROLES.map((role) => (
            <Pressable
              key={role}
              onPress={() => {
                setRoleNeeded(role);
                Haptics.selectionAsync();
              }}
              style={[
                styles.roleChip,
                {
                  backgroundColor:
                    roleNeeded === role
                      ? theme.primary + "15"
                      : theme.surface,
                  borderColor:
                    roleNeeded === role ? theme.primary : theme.border,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.roleChipText,
                  {
                    color: roleNeeded === role ? theme.primary : theme.text,
                  },
                ]}
              >
                {role}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Input
          label="Location (Major Intersection)"
          value={location}
          onChangeText={setLocation}
          placeholder="e.g., King & Bay, Toronto"
        />

        <Input
          label="Pay Structure"
          value={payStructure}
          onChangeText={setPayStructure}
          placeholder="e.g., $25/hour"
        />

        <Input
          label="Additional Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Any special requirements or instructions"
          multiline
          numberOfLines={4}
          style={styles.notesInput}
        />
      </View>

      <View style={styles.infoBox}>
        <Feather name="info" size={16} color={theme.primary} />
        <ThemedText style={[styles.infoText, { color: theme.textSecondary }]}>
          Your request will be reviewed by HR. Default shift timing is 8 hours
          starting tomorrow. You can modify details after submission.
        </ThemedText>
      </View>

      <Button
        onPress={handleSubmit}
        disabled={!isValid || isSubmitting}
        style={styles.submitButton}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          "Submit Request"
        )}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: Spacing.md,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  roleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  roleChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  roleChipText: {
    fontSize: 14,
    fontWeight: "500",
  },
  _customRoleInput: {
    marginTop: Spacing.md,
  },
  notesInput: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: Spacing.md,
  },
  infoBox: {
    flexDirection: "row",
    gap: Spacing.sm,
    padding: Spacing.lg,
    backgroundColor: "rgba(30, 64, 175, 0.08)",
    borderRadius: BorderRadius.md,
    marginBottom: Spacing["2xl"],
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  submitButton: {
    marginBottom: Spacing.lg,
  },
});
