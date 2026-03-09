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
import { useAuth, TwoFactorRequiredError } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getLoginErrorMessage } from "@/utils/errorHandler";
import { rootNavigate } from "@/lib/navigation";
import { apiRequest } from "@/lib/query-client";

WebBrowser.maybeCompleteAuthSession();

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { login, loginWithGoogleData } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_CLIENT_ID,
    responseType: "id_token",
  });

  useEffect(() => {
    if (response?.type === "success") {
      const idToken = (response.params as any).id_token;
      if (idToken) {
        handleGoogleToken(idToken);
      } else {
        setError("Google sign-in failed. Please try again.");
        setIsGoogleLoading(false);
      }
    } else if (response?.type === "error") {
      setError("Google sign-in was cancelled or failed.");
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

      if (data.requires2FA) {
        rootNavigate("TwoFactorVerify", { userId: data.userId });
        return;
      }

      if (data.user) {
        if (loginWithGoogleData) {
          await loginWithGoogleData(data.user);
        }
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setError(data.error || "Google sign-in failed. Please try again.");
      }
    } catch (err: unknown) {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsGoogleLoading(true);
    await promptAsync();
  };

  const handleLogin = async () => {
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }
    
    setError("");
    setIsLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await login(email.trim(), password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      if (err instanceof TwoFactorRequiredError) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        rootNavigate("TwoFactorVerify", { userId: err.userId });
        return;
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(getLoginErrorMessage(err));
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
          paddingTop: insets.top + Spacing["4xl"],
          paddingBottom: insets.bottom + Spacing["2xl"],
        },
      ]}
    >
      <View style={styles.header}>
        <Image
          source={require("../../assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <ThemedText type="h1" style={styles.title}>
          Workforce Connect
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: theme.textSecondary }]}>
          Staff deployment and shift management
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

      <View style={styles.form}>
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.passwordContainer}>
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
            containerStyle={styles.passwordInput}
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

        <Button onPress={handleLogin} disabled={isLoading || isGoogleLoading} style={styles.loginButton}>
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            "Sign In"
          )}
        </Button>

        {GOOGLE_CLIENT_ID ? (
          <>
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <ThemedText style={[styles.dividerText, { color: theme.textMuted }]}>or</ThemedText>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            <Pressable
              onPress={handleGoogleSignIn}
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
                    Sign in with Google
                  </ThemedText>
                </>
              )}
            </Pressable>
          </>
        ) : null}
      </View>

      <View style={styles.footer}>
        <View style={styles.signupRow}>
          <ThemedText style={[styles.footerText, { color: theme.textMuted }]}>
            Don't have an account?{" "}
          </ThemedText>
          <Pressable onPress={() => navigation.navigate("SignUp")}>
            <ThemedText style={[styles.linkText, { color: theme.primary }]}>
              Sign Up
            </ThemedText>
          </Pressable>
        </View>
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
    marginBottom: Spacing["3xl"],
  },
  logo: {
    width: 80,
    height: 80,
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
  form: {
    marginBottom: Spacing["2xl"],
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
  loginButton: {
    marginTop: Spacing.sm,
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
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minHeight: 48,
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
  footer: {
    alignItems: "center",
    marginTop: "auto",
  },
  footerText: {
    fontSize: 13,
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
  signupRow: {
    flexDirection: "row",
    marginTop: Spacing.md,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
