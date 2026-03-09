import React from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Spacing } from "@/constants/theme";
import { TitoLogsList } from "@/components/TitoLogsList";

export default function TitoLogsAdminScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const isWeb = Platform.OS === "web";

  return (
    <TitoLogsList
      paddingTop={isWeb ? Spacing.md : headerHeight + Spacing.xl}
      paddingBottom={insets.bottom + Spacing.lg}
      bottomInset={insets.bottom}
    />
  );
}
