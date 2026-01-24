import React from "react";
import { View, StyleSheet, Image, ImageSourcePropType } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { UserRole } from "@/types";

interface AvatarProps {
  name?: string;
  role?: UserRole;
  size?: number;
  imageUrl?: string;
}

const roleColors: Record<UserRole, string> = {
  client: "#3B82F6",
  worker: "#10B981",
  hr: "#8B5CF6",
  admin: "#F59E0B",
};

const roleImages: Record<UserRole, ImageSourcePropType> = {
  client: require("../../assets/images/avatar-client.png"),
  worker: require("../../assets/images/avatar-worker.png"),
  hr: require("../../assets/images/avatar-hr.png"),
  admin: require("../../assets/images/avatar-client.png"),
};

export function Avatar({ name, role = "client", size = 40, imageUrl }: AvatarProps) {
  const { theme } = useTheme();

  const getInitials = () => {
    if (!name) return "?";
    const parts = name.split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const bgColor = roleColors[role] || roleColors.client;

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[
          styles.image,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
        },
      ]}
    >
      <ThemedText
        style={[
          styles.initials,
          {
            fontSize: size * 0.4,
            color: "#FFFFFF",
          },
        ]}
      >
        {getInitials()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    backgroundColor: "#E2E8F0",
  },
  initials: {
    fontWeight: "600",
  },
});
