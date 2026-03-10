import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Layout } from "@/constants/theme";
import { useIsWideWeb } from "@/components/WebSidebarLayout";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getErrorMessage } from "@/utils/errorHandler";
import { apiRequest } from "@/lib/query-client";

WebBrowser.maybeCompleteAuthSession();

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const isWideWeb = useIsWideWeb();
  const { register, loginWithGoogleData } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const [selectedRole, setSelectedRole] = useState<"worker" | "client">("worker");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_CLIENT_ID,
    responseType: "id_token",
    prompt: "select_account",
  } as any);

  useEffect(() => {
    if (response?.type === "success") {
      const idToken = (response.params as any).id_token;
      if (idToken) {
        handleGoogleToken(idToken);
      } else {
        setError("Google sign-up failed. Please try again.");
        setIsGoogleLoading(false);
      }
    } else if (response?.type === "error") {
      setError("Google sign-up was cancelled or failed.");
      setIsGoogleLoading(false);
    } else if (response?.type === "dismiss") {
      setIsGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleToken = async (idToken: string) => {
    setIsGoogleLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/google", { idToken });
      const data = await res.json();

      if (data.registered) {
        setInfoMessage("Account created! An admin will review and activate your account. You'll receive access once approved.");
        setError("");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      if (data.pending) {
        setInfoMessage(data.message || "Your account is pending admin approval. You will be notified once access is granted.");
        setError("");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      if (data.user) {
        if (loginWithGoogleData) {
          await loginWithGoogleData(data.user);
        }
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setError(data.error || "Google sign-up failed. Please try again.");
        setInfoMessage("");
      }
    } catch (err: unknown) {
      setError("Google sign-up failed. Please try again.");
      setInfoMessage("");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    setInfoMessage("");
    setIsGoogleLoading(true);
    await promptAsync();
  };

  const handleSignUp = async () => {
    setError("");
    setInfoMessage("");

    if (!fullName.trim()) {
      setError("Please enter your full name");
      return;
    }
    if (fullName.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }
    if (!password) {
      setError("Please enter a password");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (selectedRole === "client" && !businessName.trim()) {
      setError("Please enter your business name");
      return;
    }

    setIsLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await register(
        email.trim(),
        password,
        fullName.trim(),
        selectedRole,
        selectedRole === "client" ? businessName.trim() : undefined
      );
      setInfoMessage("Account created! An admin will review and activate your account. You'll receive access once approved.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + Spacing["2xl"],
          paddingBottom: insets.bottom + Spacing["2xl"],
        },
        isWideWeb && { maxWidth: Layout.formMaxWidth, alignSelf: 'center', width: '100%' },
      ]}
    >
      <View style={styles.header}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <ThemedText type="h1" style={styles.title}>
          Create Account
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          {selectedRole === "client" ? "Join Workforce Connect as a client" : "Join Workforce Connect as a worker"}
        </ThemedText>
      </View>

      <View style={[styles.roleToggle, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
        <Pressable
          onPress={() => { setSelectedRole("worker"); setBusinessName(""); }}
          style={[
            styles.roleChip,
            selectedRole === "worker" && { backgroundColor: theme.primary },
          ]}
        >
          <ThemedText style={[styles.roleChipText, selectedRole === "worker" && { color: "#fff" }]}>
            Worker
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={() => setSelectedRole("client")}
          style={[
            styles.roleChip,
            selectedRole === "client" && { backgroundColor: theme.primary },
          ]}
        >
          <ThemedText style={[styles.roleChipText, selectedRole === "client" && { color: "#fff" }]}>
            Client
          </ThemedText>
        </Pressable>
      </View>

      {error ? (
        <View style={[styles.messageBanner, { backgroundColor: theme.error + "15" }]}>
          <Feather name="alert-circle" size={16} color={theme.error} />
          <ThemedText style={[styles.messageText, { color: theme.error }]}>
            {error}
          </ThemedText>
        </View>
      ) : null}

      {infoMessage ? (
        <View style={[styles.messageBanner, { backgroundColor: theme.primary + "15" }]}>
          <Feather name="check-circle" size={16} color={theme.primary} />
          <ThemedText style={[styles.messageText, { color: theme.primary }]}>
            {infoMessage}
          </ThemedText>
        </View>
      ) : null}

      {GOOGLE_CLIENT_ID ? (
        <>
          <Pressable
            onPress={handleGoogleSignUp}
            disabled={isLoading || isGoogleLoading || !request}
            style={({ pressed }) => [
              styles.googleButton,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
                opacity: (isLoading || isGoogleLoading || !request) ? 0.6 : pressed ? 0.8 : 1,
              },
            ]}
          >
            {isGoogleLoading ? (
              <ActivityIndicator size="small" color={theme.text} />
            ) : (
              <>
                <View style={[styles.googleIconBox, { backgroundColor: "#4285F4" }]}>
                  <ThemedText style={styles.googleIconText}>G</ThemedText>
                </View>
                <ThemedText style={[styles.googleButtonText, { color: theme.text }]}>
                  Sign up with Google
                </ThemedText>
              </>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <ThemedText style={[styles.dividerText, { color: theme.textMuted }]}>or</ThemedText>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>
        </>
      ) : null}

      <View style={styles.form}>
        <Input
          label="Full Name"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Enter your full name"
          autoCapitalize="words"
          autoComplete="name"
        />

        {selectedRole === "client" ? (
          <Input
            label="Business Name"
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Your company or business name"
            autoCapitalize="words"
          />
        ) : null}

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
        />

        <View style={styles.passwordContainer}>
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Create a password"
            secureTextEntry={!showPassword}
            containerStyle={styles.passwordInput}
            autoComplete="new-password"
          />
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
          >
            <Feather
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color={theme.textMuted}
            />
          </Pressable>
        </View>

        <Input
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm your password"
          secureTextEntry={!showPassword}
          autoComplete="new-password"
        />

        <Button onPress={handleSignUp} disabled={isLoading || isGoogleLoading} style={styles.signUpButton}>
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            "Create Account"
          )}
        </Button>
      </View>

      <View style={styles.footer}>
        <ThemedText style={[styles.footerText, { color: theme.textMuted }]}>
          Already have an account?{" "}
        </ThemedText>
        <Pressable onPress={() => navigation.navigate("Login")}>
          <ThemedText style={[styles.linkText, { color: theme.primary }]}>
            Sign In
          </ThemedText>
        </Pressable>
      </View>
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
    marginBottom: Spacing.xl,
  },
  logo: {
    width: 60,
    height: 60,
    marginBottom: Spacing.md,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 15,
  },
  roleToggle: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  roleChip: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  roleChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  messageBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  messageText: {
    fontSize: 14,
    flex: 1,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minHeight: 48,
    marginBottom: Spacing.sm,
  },
  googleIconBox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  googleIconText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.lg,
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
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
  signUpButton: {
    marginTop: Spacing.md,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
