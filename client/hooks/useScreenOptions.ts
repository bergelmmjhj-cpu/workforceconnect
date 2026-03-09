import { Platform } from "react-native";
import { NativeStackNavigationOptions } from "@react-navigation/native-stack";

import { useTheme } from "@/hooks/useTheme";

interface UseScreenOptionsParams {
  transparent?: boolean;
}

export function useScreenOptions({
  transparent = true,
}: UseScreenOptionsParams = {}): NativeStackNavigationOptions {
  const { theme, isDark } = useTheme();

  const isWeb = Platform.OS === "web";
  const useTransparent = transparent && !isWeb;

  let liquidGlassActive = false;
  if (Platform.OS === "ios") {
    const { isLiquidGlassAvailable } = require("expo-glass-effect");
    liquidGlassActive = isLiquidGlassAvailable();
  }

  return {
    headerTitleAlign: "center",
    headerTransparent: useTransparent,
    headerBlurEffect: isDark ? "dark" : "light",
    headerTintColor: theme.text,
    headerStyle: {
      backgroundColor: useTransparent ? undefined : theme.backgroundRoot,
    },
    gestureEnabled: true,
    gestureDirection: "horizontal",
    fullScreenGestureEnabled: !liquidGlassActive,
    contentStyle: {
      backgroundColor: theme.backgroundRoot,
    },
  };
}
