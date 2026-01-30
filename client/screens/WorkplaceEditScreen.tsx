import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, TextInput, Platform, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation, NavigationProp, useRoute, RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Location from "expo-location";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

type WorkplaceEditRouteProp = RouteProp<RootStackParamList, "WorkplaceEdit">;

type WorkplaceFormData = {
  name: string;
  addressLine1: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  latitude: string;
  longitude: string;
  geofenceRadiusMeters: string;
};

export default function WorkplaceEditScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<WorkplaceEditRouteProp>();
  const workplaceId = route.params?.workplaceId;
  const isEditing = !!workplaceId;
  
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<WorkplaceFormData>({
    name: "",
    addressLine1: "",
    city: "",
    province: "ON",
    postalCode: "",
    country: "Canada",
    latitude: "",
    longitude: "",
    geofenceRadiusMeters: "150",
  });
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const { data: existingWorkplace, isLoading } = useQuery({
    queryKey: ["/api/workplaces", workplaceId],
    queryFn: async () => {
      if (!workplaceId) return null;
      const response = await fetch(new URL(`/api/workplaces/${workplaceId}`, getApiUrl()).toString(), {
        headers: {
          "x-user-id": user?.id || "",
          "x-user-role": user?.role || "",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch workplace");
      return response.json();
    },
    enabled: !!workplaceId,
  });

  useEffect(() => {
    if (existingWorkplace) {
      setFormData({
        name: existingWorkplace.name || "",
        addressLine1: existingWorkplace.addressLine1 || "",
        city: existingWorkplace.city || "",
        province: existingWorkplace.province || "ON",
        postalCode: existingWorkplace.postalCode || "",
        country: existingWorkplace.country || "Canada",
        latitude: existingWorkplace.latitude?.toString() || "",
        longitude: existingWorkplace.longitude?.toString() || "",
        geofenceRadiusMeters: existingWorkplace.geofenceRadiusMeters?.toString() || "150",
      });
    }
  }, [existingWorkplace]);

  const handleGetCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required to get current coordinates");
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setFormData(prev => ({
        ...prev,
        latitude: location.coords.latitude.toFixed(6),
        longitude: location.coords.longitude.toFixed(6),
      }));
    } catch (error) {
      Alert.alert("Error", "Failed to get current location");
    } finally {
      setGettingLocation(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Error", "Workplace name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        addressLine1: formData.addressLine1.trim() || null,
        city: formData.city.trim() || null,
        province: formData.province.trim() || null,
        postalCode: formData.postalCode.trim() || null,
        country: formData.country.trim() || "Canada",
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        geofenceRadiusMeters: parseInt(formData.geofenceRadiusMeters) || 150,
      };

      const url = isEditing 
        ? new URL(`/api/workplaces/${workplaceId}`, getApiUrl()).toString()
        : new URL("/api/workplaces", getApiUrl()).toString();
      
      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
          "x-user-role": user?.role || "",
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save workplace");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/workplaces"] });
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Failed to save workplace");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof WorkplaceFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading && isEditing) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.formCard}>
          <ThemedText style={styles.sectionTitle}>Basic Information</ThemedText>
          
          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Workplace Name *</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={formData.name}
              onChangeText={(v) => updateField("name", v)}
              placeholder="e.g., Hotel Grand Toronto"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Address</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={formData.addressLine1}
              onChangeText={(v) => updateField("addressLine1", v)}
              placeholder="Street address"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 2 }]}>
              <ThemedText style={styles.label}>City</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={formData.city}
                onChangeText={(v) => updateField("city", v)}
                placeholder="City"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={styles.label}>Province</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={formData.province}
                onChangeText={(v) => updateField("province", v)}
                placeholder="ON"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={styles.label}>Postal Code</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={formData.postalCode}
                onChangeText={(v) => updateField("postalCode", v)}
                placeholder="A1B 2C3"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="characters"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={styles.label}>Country</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={formData.country}
                onChangeText={(v) => updateField("country", v)}
                placeholder="Canada"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
          </View>
        </Card>

        <Card style={styles.formCard}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>GPS Settings</ThemedText>
            <Button
              title={gettingLocation ? "Getting..." : "Use My Location"}
              onPress={handleGetCurrentLocation}
              variant="secondary"
              disabled={gettingLocation}
            />
          </View>
          
          <ThemedText style={styles.helpText}>
            GPS coordinates are required for workers to clock in/out at this location.
          </ThemedText>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={styles.label}>Latitude</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={formData.latitude}
                onChangeText={(v) => updateField("latitude", v)}
                placeholder="43.6532"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={styles.label}>Longitude</ThemedText>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={formData.longitude}
                onChangeText={(v) => updateField("longitude", v)}
                placeholder="-79.3832"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.label}>Geofence Radius (meters)</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              value={formData.geofenceRadiusMeters}
              onChangeText={(v) => updateField("geofenceRadiusMeters", v)}
              placeholder="150"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
            />
            <ThemedText style={styles.radiusHelp}>
              Workers must be within this distance to clock in/out
            </ThemedText>
          </View>
        </Card>

        <Button
          title={saving ? "Saving..." : isEditing ? "Update Workplace" : "Create Workplace"}
          onPress={handleSave}
          disabled={saving || !formData.name.trim()}
          style={styles.saveButton}
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  formCard: {
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  helpText: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  radiusHelp: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: Spacing.xs,
  },
  saveButton: {
    marginTop: Spacing.md,
  },
});
