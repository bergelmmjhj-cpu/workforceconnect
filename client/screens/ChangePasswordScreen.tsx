import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user, updateUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleChangePassword = async () => {
    setError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword === currentPassword) {
      setError("New password must be different from current password");
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/change-password", {
        currentPassword,
        newPassword,
      });
      const data = await res.json();

      if (data.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await updateUser({ mustChangePassword: false });
      } else {
        setError(data.error || "Failed to change password");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (err: any) {
      let msg = "Failed to change password";
      try {
        if (err?.data?.error) msg = err.data.error;
        else if (err?.message) msg = err.message;
      } catch {}
      setError(msg);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + Spacing.xxl,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primary + "20" }]}>
            <Feather name="lock" size={40} color={theme.primary} />
          </View>
        </View>

        <ThemedText type="h2" style={styles.title}>
          Change Your Password
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          For your security, please set a new password before continuing.
        </ThemedText>

        {error ? (
          <View style={[styles.errorBanner, { backgroundColor: theme.error + "15" }]}>
            <Feather name="alert-circle" size={16} color={theme.error} />
            <ThemedText style={[styles.errorText, { color: theme.error }]}>
              {error}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.form}>
          <View>
            <Input
              testID="input-current-password"
              label="Current Password"
              placeholder="Enter your temporary password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrent}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeButton}>
              <Feather name={showCurrent ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
            </Pressable>
          </View>

          <View>
            <Input
              testID="input-new-password"
              label="New Password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNew}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable onPress={() => setShowNew(!showNew)} style={styles.eyeButton}>
              <Feather name={showNew ? "eye-off" : "eye"} size={20} color={theme.textSecondary} />
            </Pressable>
          </View>

          <Input
            testID="input-confirm-password"
            label="Confirm New Password"
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showNew}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <Pressable
          testID="button-change-password"
          onPress={handleChangePassword}
          disabled={isLoading}
          style={[
            styles.button,
            {
              backgroundColor: theme.primary,
              opacity: isLoading ? 0.7 : 1,
            },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="check" size={20} color="#FFFFFF" />
          )}
          <ThemedText style={styles.buttonText}>
            {isLoading ? "Updating..." : "Set New Password"}
          </ThemedText>
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  form: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    bottom: 12,
    padding: 4,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
