import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { UserRole } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { register } = useAuth();
  const navigation = useNavigation<NavigationProp>();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("worker");
  const [error, setError] = useState("");

  const roles: { role: UserRole; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { role: "worker", label: "Worker", icon: "user" },
    { role: "client", label: "Client", icon: "briefcase" },
    { role: "hr", label: "HR", icon: "users" },
    { role: "admin", label: "Admin", icon: "settings" },
  ];

  const handleSignUp = async () => {
    setError("");

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

    setIsLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await register(email.trim(), password, fullName.trim(), selectedRole);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: unknown) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create account");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    Haptics.selectionAsync();
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
          Join Workforce Connect
        </ThemedText>
      </View>

      <View style={styles.roleSelector}>
        <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          I am a
        </ThemedText>
        <View style={styles.roleGrid}>
          {roles.map(({ role, label, icon }) => (
            <Pressable
              key={role}
              onPress={() => handleRoleSelect(role)}
              style={[
                styles.roleCard,
                {
                  backgroundColor:
                    selectedRole === role
                      ? theme.primary + "15"
                      : theme.surface,
                  borderColor:
                    selectedRole === role ? theme.primary : theme.border,
                },
              ]}
            >
              <View
                style={[
                  styles.roleIcon,
                  {
                    backgroundColor:
                      selectedRole === role
                        ? theme.primary
                        : theme.backgroundSecondary,
                  },
                ]}
              >
                <Feather
                  name={icon}
                  size={18}
                  color={selectedRole === role ? "#fff" : theme.textSecondary}
                />
              </View>
              <ThemedText
                style={[
                  styles.roleLabel,
                  {
                    color: selectedRole === role ? theme.primary : theme.text,
                    fontWeight: selectedRole === role ? "600" : "400",
                  },
                ]}
              >
                {label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
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
          label="Full Name"
          value={fullName}
          onChangeText={setFullName}
          placeholder="Enter your full name"
          autoCapitalize="words"
        />

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
            placeholder="Create a password"
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

        <Input
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm your password"
          secureTextEntry={!showPassword}
        />

        <Button onPress={handleSignUp} disabled={isLoading} style={styles.signUpButton}>
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
    marginBottom: Spacing["2xl"],
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
  roleSelector: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
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
  roleCard: {
    flex: 1,
    minWidth: "22%",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  roleIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  roleLabel: {
    fontSize: 12,
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
