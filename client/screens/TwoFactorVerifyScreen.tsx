import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "TwoFactorVerify">;

export default function TwoFactorVerifyScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { complete2FALogin } = useAuth();

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const inputRef = useRef<TextInput>(null);

  const handleVerify = async () => {
    const verifyCode = useRecoveryCode ? recoveryCode.trim() : code;
    if (!verifyCode) {
      setError(useRecoveryCode ? "Please enter a recovery code" : "Please enter the 6-digit code");
      return;
    }

    setError("");
    setIsLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await complete2FALogin(userId, verifyCode);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (result.remainingRecoveryCodes !== undefined && result.remainingRecoveryCodes < 3) {
        console.log(`Warning: Only ${result.remainingRecoveryCodes} recovery codes remaining`);
      }
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Invalid code. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecoveryMode = () => {
    setUseRecoveryCode(!useRecoveryCode);
    setError("");
    setCode("");
    setRecoveryCode("");
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + Spacing["4xl"],
          paddingBottom: insets.bottom + Spacing["2xl"],
        },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: theme.primary + "15" }]}>
          <Feather name="shield" size={40} color={theme.primary} />
        </View>
        <ThemedText type="h2" style={styles.title}>
          Two-Factor Authentication
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          {useRecoveryCode
            ? "Enter one of your recovery codes to sign in."
            : "Enter the 6-digit code from your authenticator app."}
        </ThemedText>
      </View>

      {error ? (
        <View style={[styles.errorContainer, { backgroundColor: theme.error + "15" }]}>
          <Feather name="alert-circle" size={16} color={theme.error} />
          <ThemedText style={[styles.errorText, { color: theme.error }]}>
            {error}
          </ThemedText>
        </View>
      ) : null}

      {useRecoveryCode ? (
        <TextInput
          ref={inputRef}
          value={recoveryCode}
          onChangeText={setRecoveryCode}
          placeholder="Enter recovery code"
          placeholderTextColor={theme.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          style={[
            styles.recoveryInput,
            {
              backgroundColor: theme.surface,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          testID="input-recovery-code"
        />
      ) : (
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ""))}
          placeholder="000000"
          placeholderTextColor={theme.textMuted}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          style={[
            styles.codeInput,
            {
              backgroundColor: theme.surface,
              color: theme.text,
              borderColor: theme.border,
            },
          ]}
          testID="input-2fa-login-code"
        />
      )}

      <Pressable
        onPress={handleVerify}
        disabled={isLoading || (useRecoveryCode ? !recoveryCode.trim() : code.length !== 6)}
        style={[
          styles.verifyButton,
          {
            backgroundColor: theme.primary,
            opacity: isLoading || (useRecoveryCode ? !recoveryCode.trim() : code.length !== 6) ? 0.5 : 1,
          },
        ]}
        testID="button-verify-2fa-login"
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText style={styles.verifyButtonText}>Verify & Sign In</ThemedText>
        )}
      </Pressable>

      <Pressable onPress={toggleRecoveryMode} style={styles.toggleButton}>
        <ThemedText style={[styles.toggleText, { color: theme.primary }]}>
          {useRecoveryCode ? "Use authenticator code instead" : "Use a recovery code instead"}
        </ThemedText>
      </Pressable>

      <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
        <Feather name="arrow-left" size={16} color={theme.textSecondary} />
        <ThemedText style={[styles.backText, { color: theme.textSecondary }]}>
          Back to Sign In
        </ThemedText>
      </Pressable>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: Spacing.lg,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  codeInput: {
    fontSize: 32,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 12,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  recoveryInput: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 2,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    marginBottom: Spacing.xl,
    fontFamily: "monospace",
  },
  verifyButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  verifyButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  toggleButton: {
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "500",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  backText: {
    fontSize: 14,
  },
});
