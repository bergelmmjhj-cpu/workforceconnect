import React, { useState } from "react";
import { View, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius, Layout } from "@/constants/theme";
import { useIsWideWeb } from "@/components/WebSidebarLayout";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RoutePropType = RouteProp<RootStackParamList, "ResetPassword">;

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const isWideWeb = useIsWideWeb();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropType>();

  const token = route.params?.token || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    setError("");
    if (!newPassword) {
      setError("Please enter a new password");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!token) {
      setError("Invalid reset link. Please request a new one.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/reset-password", { token, newPassword });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || "Failed to reset password. The link may have expired.");
      }
    } catch (err: unknown) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing["4xl"], paddingBottom: insets.bottom + Spacing["2xl"] },
        isWideWeb && { maxWidth: Layout.formMaxWidth, alignSelf: 'center', width: '100%' },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.iconCircle, { backgroundColor: theme.primary + "20" }]}>
          <Feather name="key" size={32} color={theme.primary} />
        </View>
        <ThemedText type="h1" style={styles.title}>Set New Password</ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          Enter your new password below
        </ThemedText>
      </View>

      {error ? (
        <View style={[styles.banner, { backgroundColor: theme.error + "15" }]}>
          <Feather name="alert-circle" size={16} color={theme.error} />
          <ThemedText style={[styles.bannerText, { color: theme.error }]}>{error}</ThemedText>
        </View>
      ) : null}

      {success ? (
        <>
          <View style={[styles.banner, { backgroundColor: theme.primary + "15" }]}>
            <Feather name="check-circle" size={16} color={theme.primary} />
            <ThemedText style={[styles.bannerText, { color: theme.primary }]}>
              Password reset successfully! You can now sign in with your new password.
            </ThemedText>
          </View>
          <Button onPress={() => navigation.navigate("Login")} style={styles.submitButton}>
            Go to Sign In
          </Button>
        </>
      ) : (
        <View style={styles.form}>
          <View style={styles.passwordContainer}>
            <Input
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="At least 8 characters"
              secureTextEntry={!showPassword}
              containerStyle={styles.passwordInput}
              autoComplete="new-password"
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={20} color={theme.textMuted} />
            </Pressable>
          </View>

          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat your new password"
            secureTextEntry={!showPassword}
            autoComplete="new-password"
          />

          <Button onPress={handleReset} disabled={isLoading} style={styles.submitButton}>
            {isLoading ? <ActivityIndicator color="#fff" size="small" /> : "Reset Password"}
          </Button>
        </View>
      )}

      {!success ? (
        <Pressable onPress={() => navigation.navigate("Login")} style={styles.backLink}>
          <Feather name="arrow-left" size={16} color={theme.primary} />
          <ThemedText style={[styles.backLinkText, { color: theme.primary }]}>Back to Sign In</ThemedText>
        </Pressable>
      ) : null}
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 15,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  bannerText: {
    fontSize: 14,
    flex: 1,
  },
  form: {
    marginBottom: Spacing.xl,
  },
  passwordContainer: {
    position: "relative",
  },
  passwordInput: {
    marginBottom: Spacing.lg,
  },
  eyeButton: {
    position: "absolute",
    right: Spacing.lg,
    top: 32,
    padding: Spacing.sm,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    marginTop: Spacing.xl,
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
