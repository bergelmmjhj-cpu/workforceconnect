import { Platform } from "react-native";

export const Colors = {
  light: {
    // Core colors from design guidelines
    primary: "#1E40AF",
    primaryLight: "#3B82F6",
    primaryDark: "#1E3A8A",
    accent: "#F59E0B",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    
    // Text colors
    text: "#0F172A",
    textSecondary: "#64748B",
    textMuted: "#94A3B8",
    buttonText: "#FFFFFF",
    
    // Background colors (elevation system)
    backgroundRoot: "#F8FAFC",
    backgroundDefault: "#FFFFFF",
    backgroundSecondary: "#F1F5F9",
    backgroundTertiary: "#E2E8F0",
    inputBackground: "#FFFFFF",
    
    // UI elements
    border: "#E2E8F0",
    surface: "#FFFFFF",
    tabIconDefault: "#64748B",
    tabIconSelected: "#1E40AF",
    link: "#1E40AF",
    
    // Status colors
    statusDraft: "#94A3B8",
    statusSubmitted: "#3B82F6",
    statusInProgress: "#10B981",
    statusCompleted: "#64748B",
    statusCancelled: "#EF4444",
    statusSlaWarning: "#F59E0B",
    statusSlaBreach: "#EF4444",
  },
  dark: {
    // Core colors
    primary: "#3B82F6",
    primaryLight: "#60A5FA",
    primaryDark: "#1E40AF",
    accent: "#FBBF24",
    success: "#34D399",
    warning: "#FBBF24",
    error: "#F87171",
    
    // Text colors
    text: "#F8FAFC",
    textSecondary: "#94A3B8",
    textMuted: "#64748B",
    buttonText: "#FFFFFF",
    
    // Background colors (elevation system)
    backgroundRoot: "#0F172A",
    backgroundDefault: "#1E293B",
    backgroundSecondary: "#334155",
    backgroundTertiary: "#475569",
    inputBackground: "#1E293B",
    
    // UI elements
    border: "#334155",
    surface: "#1E293B",
    tabIconDefault: "#64748B",
    tabIconSelected: "#3B82F6",
    link: "#3B82F6",
    
    // Status colors
    statusDraft: "#64748B",
    statusSubmitted: "#60A5FA",
    statusInProgress: "#34D399",
    statusCompleted: "#94A3B8",
    statusCancelled: "#F87171",
    statusSlaWarning: "#FBBF24",
    statusSlaBreach: "#F87171",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const BorderRadius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 20,
  "3xl": 24,
  full: 9999,
};

export const Typography = {
  display: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
    letterSpacing: -0.32,
  },
  h1: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "700" as const,
    letterSpacing: -0.24,
  },
  h2: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
    letterSpacing: -0.2,
  },
  h3: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
    letterSpacing: 0.12,
  },
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500" as const,
    letterSpacing: 0.14,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
};

export const Shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "Inter_400Regular",
    sansMedium: "Inter_500Medium",
    sansSemiBold: "Inter_600SemiBold",
    sansBold: "Inter_700Bold",
    mono: "ui-monospace",
  },
  default: {
    sans: "Inter_400Regular",
    sansMedium: "Inter_500Medium",
    sansSemiBold: "Inter_600SemiBold",
    sansBold: "Inter_700Bold",
    mono: "monospace",
  },
  web: {
    sans: "Inter, system-ui, -apple-system, sans-serif",
    sansMedium: "Inter, system-ui, -apple-system, sans-serif",
    sansSemiBold: "Inter, system-ui, -apple-system, sans-serif",
    sansBold: "Inter, system-ui, -apple-system, sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  },
});
