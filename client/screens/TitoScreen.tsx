import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useContentPadding } from "@/hooks/useContentPadding";
import { Spacing } from "@/constants/theme";
import { TitoLogsList } from "@/components/TitoLogsList";

export default function TitoScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { paddingTop } = useContentPadding();

  return (
    <TitoLogsList
      paddingTop={paddingTop}
      paddingBottom={tabBarHeight + Spacing.xl}
      bottomInset={insets.bottom}
    />
  );
}
