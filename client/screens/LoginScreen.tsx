import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Image,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { UserRole } from "@/types";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("client");

  const demoEmails: Record<UserRole, string> = {
    client: "client@example.com",
    worker: "worker@example.com",
    hr: "hr@example.com",
    admin: "admin@example.com",
  };

  const roles: { role: UserRole; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { role: "client", label: "Client", icon: "briefcase" },
    { role: "worker", label: "Worker", icon: "user" },
    { role: "hr", label: "HR", icon: "users" },
    { role: "admin", label: "Admin", icon: "settings" },
  ];

  const handleLogin = async () => {
    setIsLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await login(email || demoEmails[selectedRole], password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setEmail(demoEmails[role]);
    Haptics.selectionAsync();
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

      <View style={styles.roleSelector}>
        <ThemedText style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          Demo Login As
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

        <Button onPress={handleLogin} disabled={isLoading} style={styles.loginButton}>
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            "Sign In"
          )}
        </Button>
      </View>

      <View style={styles.footer}>
        <ThemedText style={[styles.footerText, { color: theme.textMuted }]}>
          Demo mode - any password works
        </ThemedText>
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
  roleSelector: {
    marginBottom: Spacing["2xl"],
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
    gap: Spacing.md,
  },
  roleCard: {
    flex: 1,
    minWidth: "45%",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  roleLabel: {
    fontSize: 14,
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
  footer: {
    alignItems: "center",
    marginTop: "auto",
  },
  footerText: {
    fontSize: 13,
  },
});
