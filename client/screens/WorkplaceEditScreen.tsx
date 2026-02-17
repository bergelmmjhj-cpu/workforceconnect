import React, { useState, useEffect } from "react";
import { View, StyleSheet, ScrollView, TextInput, Modal, Pressable } from "react-native";
import { useNavigation, NavigationProp, useRoute, RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { AddressAutocomplete, AddressData } from "@/components/AddressAutocomplete";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { Spacing, BorderRadius } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { getErrorMessage } from "@/utils/errorHandler";

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
  const [isAddressSelected, setIsAddressSelected] = useState(false);
  const [addressSearchValue, setAddressSearchValue] = useState("");
  const [alertModal, setAlertModal] = useState<{title: string; message: string} | null>(null);

  const { data: existingWorkplace, isLoading } = useQuery<any>({
    queryKey: ["/api/workplaces", workplaceId],
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
      if (existingWorkplace.addressLine1 && existingWorkplace.latitude && existingWorkplace.longitude) {
        const fullAddress = [
          existingWorkplace.addressLine1,
          existingWorkplace.city,
          existingWorkplace.province,
          existingWorkplace.postalCode,
          existingWorkplace.country
        ].filter(Boolean).join(", ");
        setAddressSearchValue(fullAddress);
        setIsAddressSelected(true);
      }
    }
  }, [existingWorkplace]);

  const handleAddressSelect = (address: AddressData) => {
    setFormData(prev => ({
      ...prev,
      addressLine1: address.addressLine1,
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      country: address.country || "Canada",
      latitude: address.latitude?.toString() || "",
      longitude: address.longitude?.toString() || "",
    }));
    setIsAddressSelected(true);
  };

  const handleAddressClear = () => {
    setFormData(prev => ({
      ...prev,
      addressLine1: "",
      city: "",
      province: "",
      postalCode: "",
      country: "Canada",
      latitude: "",
      longitude: "",
    }));
    setIsAddressSelected(false);
    setAddressSearchValue("");
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setAlertModal({title: "Missing Information", message: "Please enter a workplace name."});
      return;
    }

    if (!isAddressSelected || !formData.latitude || !formData.longitude) {
      setAlertModal({title: "Address Required", message: "Please select an address from the suggested list to ensure accurate GPS coordinates for TITO validation."});
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

      const route = isEditing 
        ? `/api/workplaces/${workplaceId}`
        : "/api/workplaces";
      
      await apiRequest(isEditing ? "PUT" : "POST", route, payload);

      queryClient.invalidateQueries({ queryKey: ["/api/workplaces"] });
      navigation.goBack();
    } catch (error) {
      setAlertModal({title: "Unable to Save", message: getErrorMessage(error)});
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
      <Modal visible={alertModal !== null} transparent animationType="fade" onRequestClose={() => setAlertModal(null)}>
        <Pressable style={{flex:1, backgroundColor:"rgba(0,0,0,0.5)", justifyContent:"center", alignItems:"center", padding:24}} onPress={() => setAlertModal(null)}>
          <Pressable style={{backgroundColor: theme.backgroundDefault, borderRadius:12, padding:24, width:"100%", maxWidth:340}} onPress={() => {}}>
            <ThemedText type="h4" style={{marginBottom:12}}>{alertModal?.title}</ThemedText>
            <ThemedText style={{color: theme.textSecondary, fontSize:14, lineHeight:20, marginBottom:24}}>{alertModal?.message}</ThemedText>
            <View style={{flexDirection:"row", gap:12}}>
              <Pressable style={{flex:1, backgroundColor: theme.primary, borderRadius:8, paddingVertical:12, alignItems:"center"}} onPress={() => setAlertModal(null)}>
                <ThemedText style={{color:"#FFFFFF", fontWeight:"600", fontSize:15}}>OK</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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

          <AddressAutocomplete
            label="Search Address *"
            value={addressSearchValue}
            onAddressSelect={handleAddressSelect}
            onClear={handleAddressClear}
            placeholder="Start typing an address..."
            userRole={user?.role || ""}
            userId={user?.id || ""}
            isAddressSelected={isAddressSelected}
            error={!isAddressSelected && formData.name.trim() ? "Please select an address from the suggestions" : undefined}
          />

          {isAddressSelected ? (
            <>
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 2 }]}>
                  <ThemedText style={styles.label}>Street Address</ThemedText>
                  <TextInput
                    style={[styles.input, styles.readOnlyInput, { color: theme.textSecondary, borderColor: theme.border }]}
                    value={formData.addressLine1}
                    editable={false}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 2 }]}>
                  <ThemedText style={styles.label}>City</ThemedText>
                  <TextInput
                    style={[styles.input, styles.readOnlyInput, { color: theme.textSecondary, borderColor: theme.border }]}
                    value={formData.city}
                    editable={false}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <ThemedText style={styles.label}>Province</ThemedText>
                  <TextInput
                    style={[styles.input, styles.readOnlyInput, { color: theme.textSecondary, borderColor: theme.border }]}
                    value={formData.province}
                    editable={false}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <ThemedText style={styles.label}>Postal Code</ThemedText>
                  <TextInput
                    style={[styles.input, styles.readOnlyInput, { color: theme.textSecondary, borderColor: theme.border }]}
                    value={formData.postalCode}
                    editable={false}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <ThemedText style={styles.label}>Country</ThemedText>
                  <TextInput
                    style={[styles.input, styles.readOnlyInput, { color: theme.textSecondary, borderColor: theme.border }]}
                    value={formData.country}
                    editable={false}
                  />
                </View>
              </View>
            </>
          ) : null}
        </Card>

        <Card style={styles.formCard}>
          <ThemedText style={styles.sectionTitle}>GPS Settings</ThemedText>
          
          <ThemedText style={styles.helpText}>
            GPS coordinates are automatically populated when you select an address. These are required for workers to clock in/out at this location.
          </ThemedText>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={styles.label}>Latitude</ThemedText>
              <TextInput
                style={[styles.input, styles.readOnlyInput, { color: theme.textSecondary, borderColor: isAddressSelected && formData.latitude ? theme.success : theme.border }]}
                value={formData.latitude}
                editable={false}
                placeholder="Auto-populated from address"
                placeholderTextColor={theme.textMuted}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText style={styles.label}>Longitude</ThemedText>
              <TextInput
                style={[styles.input, styles.readOnlyInput, { color: theme.textSecondary, borderColor: isAddressSelected && formData.longitude ? theme.success : theme.border }]}
                value={formData.longitude}
                editable={false}
                placeholder="Auto-populated from address"
                placeholderTextColor={theme.textMuted}
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
  readOnlyInput: {
    backgroundColor: "rgba(128, 128, 128, 0.1)",
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
