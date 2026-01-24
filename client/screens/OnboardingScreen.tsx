import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  FlatList,
  ViewToken,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { Spacing, BorderRadius } from "@/constants/theme";

const { width } = Dimensions.get("window");

interface OnboardingSlide {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
}

const slides: OnboardingSlide[] = [
  {
    id: "1",
    icon: "home",
    title: "Welcome to Workforce Connect",
    description:
      "Your enterprise workforce management solution. Manage worker requests, track shifts, and stay connected with your team all in one place.",
  },
  {
    id: "2",
    icon: "users",
    title: "Role-Based Experience",
    description:
      "The app adapts to your role. Clients request workers, employees view shifts, HR manages approvals, and admins oversee everything.",
  },
  {
    id: "3",
    icon: "calendar",
    title: "Manage Shifts Easily",
    description:
      "View upcoming shifts, check schedules, and stay on top of your work assignments. Filter by status to find what you need quickly.",
  },
  {
    id: "4",
    icon: "clock",
    title: "Time In / Time Out",
    description:
      "Track work hours with our TITO system. Clock in and out with ease, and managers can approve time entries seamlessly.",
  },
  {
    id: "5",
    icon: "message-circle",
    title: "Stay Connected",
    description:
      "Communicate with your team through built-in messaging. Get updates, discuss shifts, and coordinate with colleagues.",
  },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { completeOnboarding } = useOnboarding();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const handleNext = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      await completeOnboarding();
    }
  };

  const handleSkip = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await completeOnboarding();
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={[styles.slide, { width }]}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: theme.backgroundSecondary },
        ]}
      >
        <Feather name={item.icon} size={64} color={theme.primary} />
      </View>
      <ThemedText style={styles.title}>{item.title}</ThemedText>
      <ThemedText style={[styles.description, { color: theme.textSecondary }]}>
        {item.description}
      </ThemedText>
    </View>
  );

  const isLastSlide = currentIndex === slides.length - 1;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundRoot,
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
    >
      <View style={styles.header}>
        {!isLastSlide ? (
          <Pressable
            onPress={handleSkip}
            style={({ pressed }) => [
              styles.skipButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <ThemedText style={[styles.skipText, { color: theme.textSecondary }]}>
              Skip
            </ThemedText>
          </Pressable>
        ) : (
          <View style={styles.skipButton} />
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === currentIndex ? theme.primary : theme.border,
                  width: index === currentIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        <Button
          onPress={handleNext}
          style={styles.nextButton}
        >
          {isLastSlide ? "Get Started" : "Next"}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  skipButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    minWidth: 60,
  },
  skipText: {
    fontSize: 16,
    fontWeight: "500",
  },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["3xl"],
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.lg,
    lineHeight: 36,
  },
  description: {
    fontSize: 17,
    textAlign: "center",
    lineHeight: 26,
    paddingHorizontal: Spacing.md,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.xl,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: BorderRadius.full,
  },
  nextButton: {
    marginTop: Spacing.md,
  },
});
