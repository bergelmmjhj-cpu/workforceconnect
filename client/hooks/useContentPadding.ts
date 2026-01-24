import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Spacing } from "@/constants/theme";

interface ContentPadding {
  paddingTop: number;
  paddingBottom: number;
}

export function useContentPadding(): ContentPadding {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();

  const isWeb = Platform.OS === "web";

  const paddingTop = isWeb ? Spacing.lg : headerHeight + Spacing.lg;
  const paddingBottom = tabBarHeight + Spacing.xl;

  return { paddingTop, paddingBottom };
}

export function useStackContentPadding(): ContentPadding {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const isWeb = Platform.OS === "web";

  const paddingTop = isWeb ? Spacing.lg : headerHeight + Spacing.lg;
  const paddingBottom = insets.bottom + Spacing.xl;

  return { paddingTop, paddingBottom };
}
