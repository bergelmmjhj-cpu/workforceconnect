import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = BorderRadius.sm,
  style,
}: SkeletonProps) {
  const { theme } = useTheme();
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1200 }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.6, 0.3]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: theme.textMuted,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function CardSkeleton() {
  const { theme } = useTheme();

  return (
    <View
      style={[styles.cardContainer, { backgroundColor: theme.surface }]}
    >
      <View style={styles.cardHeader}>
        <Skeleton width="60%" height={20} />
        <Skeleton width={80} height={24} borderRadius={BorderRadius.full} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Skeleton width={14} height={14} borderRadius={BorderRadius.full} />
          <Skeleton width="70%" height={14} />
        </View>
        <View style={styles.cardRow}>
          <Skeleton width={14} height={14} borderRadius={BorderRadius.full} />
          <Skeleton width="50%" height={14} />
        </View>
        <View style={styles.cardRow}>
          <Skeleton width={14} height={14} borderRadius={BorderRadius.full} />
          <Skeleton width="60%" height={14} />
        </View>
      </View>
    </View>
  );
}

export function StatCardSkeleton() {
  const { theme } = useTheme();

  return (
    <View
      style={[styles.statContainer, { backgroundColor: theme.surface }]}
    >
      <Skeleton width={40} height={40} borderRadius={BorderRadius.md} />
      <Skeleton width="50%" height={12} style={{ marginTop: Spacing.md }} />
      <Skeleton width="40%" height={24} style={{ marginTop: Spacing.xs }} />
    </View>
  );
}

export function ConversationSkeleton() {
  const { theme } = useTheme();

  return (
    <View style={[styles.conversationContainer, { backgroundColor: theme.surface }]}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={styles.conversationContent}>
        <View style={styles.conversationTop}>
          <Skeleton width="60%" height={16} />
          <Skeleton width={50} height={12} />
        </View>
        <Skeleton width="80%" height={14} style={{ marginTop: Spacing.xs }} />
      </View>
    </View>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  cardBody: {
    gap: Spacing.sm,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statContainer: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    minHeight: 120,
  },
  conversationContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  conversationContent: {
    flex: 1,
  },
  conversationTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listContainer: {
    gap: Spacing.md,
  },
});
