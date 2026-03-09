import { Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Spacing } from "@/constants/theme";

interface ContentPadding {
  paddingTop: number;
  paddingBottom: number;
}

export function useContentPadding(): ContentPadding {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { width } = useWindowDimensions();

  const isWeb = Platform.OS === "web";
  const isWideWeb = isWeb && width > 768;

  const paddingTop = isWeb ? Spacing.md : headerHeight + Spacing.xl;
  const paddingBottom = isWideWeb ? Spacing.lg : tabBarHeight + Spacing.xl;

  return { paddingTop, paddingBottom };
}

export function useStackContentPadding(): ContentPadding {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const isWeb = Platform.OS === "web";

  const paddingTop = isWeb ? Spacing.md : headerHeight + Spacing.xl;
  const paddingBottom = insets.bottom + Spacing.xl;

  return { paddingTop, paddingBottom };
}
