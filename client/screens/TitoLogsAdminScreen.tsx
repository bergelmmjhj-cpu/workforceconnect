import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Spacing } from "@/constants/theme";
import { TitoLogsList } from "@/components/TitoLogsList";

export default function TitoLogsAdminScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  return (
    <TitoLogsList
      paddingTop={headerHeight + Spacing.xl}
      paddingBottom={insets.bottom + Spacing.xl}
      bottomInset={insets.bottom}
    />
  );
}
