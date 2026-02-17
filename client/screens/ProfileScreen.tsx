import React, { useState } from "react";
import { View, StyleSheet, Pressable, Switch, ScrollView, TextInput, Modal, Image, Platform, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ThemedText } from "@/components/ThemedText";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useContentPadding } from "@/hooks/useContentPadding";
import { Spacing, BorderRadius } from "@/constants/theme";
import { UserRole, ClientType, CLIENT_TYPES } from "@/types";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { apiRequest } from "@/lib/query-client";
import QRCode from "react-native-qrcode-svg";

const roleLabels: Record<UserRole, string> = {
  client: "Client",
  worker: "Worker",
  hr: "HR Manager",
  admin: "Administrator",
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { paddingTop, paddingBottom } = useContentPadding();
  const { theme } = useTheme();
  const { user, logout, updateUser } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showClientTypeModal, setShowClientTypeModal] = useState(false);
  const [showBusinessDetailsModal, setShowBusinessDetailsModal] = useState(false);
  const [businessName, setBusinessName] = useState(user?.businessName || "");
  const [businessAddress, setBusinessAddress] = useState(user?.businessAddress || "");
  const [businessPhone, setBusinessPhone] = useState(user?.businessPhone || "");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  const [bankName, setBankName] = useState<string>("");
  const [bankInstitution, setBankInstitution] = useState<string>("");
  const [bankTransit, setBankTransit] = useState<string>("");
  const [bankAccount, setBankAccount] = useState<string>("");
  const [etransferEmail, setEtransferEmail] = useState<string>("");

  const [showTrialResetModal, setShowTrialResetModal] = useState(false);
  const [trialResetStep, setTrialResetStep] = useState<"preview" | "confirm" | "done">("preview");
  const [dryRunData, setDryRunData] = useState<any>(null);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [resetResult, setResetResult] = useState<any>(null);

  const queryClient = useQueryClient();

  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFAStep, setTwoFAStep] = useState<"setup" | "verify" | "recovery" | "disable">("setup");
  const [twoFAUri, setTwoFAUri] = useState("");
  const [twoFACode, setTwoFACode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [twoFADisableCode, setTwoFADisableCode] = useState("");

  const { data: photoData, refetch: refetchPhoto } = useQuery<any>({
    queryKey: ["/api/profile-photo"],
  });

  const { data: twoFAStatus, refetch: refetch2FA } = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/2fa/status"],
  });

  const setup2FAMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/2fa/setup");
      return res.json();
    },
    onSuccess: (data: any) => {
      setTwoFAUri(data.uri);
      setTwoFAStep("verify");
    },
  });

  const verify2FAMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/2fa/verify-setup", { code });
      return res.json();
    },
    onSuccess: (data: any) => {
      setRecoveryCodes(data.recoveryCodes);
      setTwoFAStep("recovery");
      refetch2FA();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const disable2FAMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest("POST", "/api/2fa/disable", { code });
      return res.json();
    },
    onSuccess: () => {
      setShow2FAModal(false);
      setTwoFADisableCode("");
      refetch2FA();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (photoData: string) => {
      const res = await apiRequest("POST", "/api/profile-photo", { photoData });
      return res.json();
    },
    onSuccess: () => {
      refetchPhoto();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const { data: paymentProfile } = useQuery<any>({
    queryKey: ["/api/payment-profile"],
    enabled: user?.role === "worker",
  });

  const savePaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", "/api/payment-profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-profile"] });
      setShowPaymentModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const handleSelectClientType = async (type: ClientType) => {
    await Haptics.selectionAsync();
    if (updateUser) {
      await updateUser({ clientType: type });
    }
    setShowClientTypeModal(false);
  };

  const handleSaveBusinessDetails = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (updateUser) {
      await updateUser({
        businessName: businessName.trim(),
        businessAddress: businessAddress.trim(),
        businessPhone: businessPhone.trim(),
      });
    }
    setShowBusinessDetailsModal(false);
  };

  const handleNotificationToggle = (value: boolean) => {
    setNotificationsEnabled(value);
    if (value) {
      Haptics.selectionAsync();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const handleLogout = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logout();
  };

  const dryRunMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/trial-reset/dry-run");
      return res.json();
    },
    onSuccess: (data) => {
      setDryRunData(data);
      setTrialResetStep("confirm");
    },
  });

  const executeResetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/trial-reset/execute", { confirmPhrase });
      return res.json();
    },
    onSuccess: (data) => {
      setResetResult(data);
      setTrialResetStep("done");
      queryClient.invalidateQueries();
    },
  });

  const handleOpenTrialReset = () => {
    setTrialResetStep("preview");
    setDryRunData(null);
    setConfirmPhrase("");
    setResetResult(null);
    setShowTrialResetModal(true);
  };

  const handleOpenPaymentModal = () => {
    if (paymentProfile) {
      setBankName(paymentProfile.bankName || "");
      setBankInstitution(paymentProfile.bankInstitution || "");
      setBankTransit(paymentProfile.bankTransit || "");
      setBankAccount(paymentProfile.bankAccount || "");
      setEtransferEmail(paymentProfile.etransferEmail || "");
    } else {
      setBankName("");
      setBankInstitution("");
      setBankTransit("");
      setBankAccount("");
      setEtransferEmail("");
    }
    setShowPaymentModal(true);
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const mimeType = result.assets[0].mimeType || "image/jpeg";
      const dataUri = `data:${mimeType};base64,${result.assets[0].base64}`;
      uploadPhotoMutation.mutate(dataUri);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const mimeType = result.assets[0].mimeType || "image/jpeg";
      const dataUri = `data:${mimeType};base64,${result.assets[0].base64}`;
      uploadPhotoMutation.mutate(dataUri);
    }
  };

  const handleSavePayment = () => {
    savePaymentMutation.mutate({
      paymentMethod: "both",
      bankName,
      bankInstitution,
      bankTransit,
      bankAccount,
      etransferEmail,
    });
  };

  const handleOpen2FA = () => {
    if (twoFAStatus?.enabled) {
      setTwoFAStep("disable");
      setTwoFADisableCode("");
    } else {
      setTwoFAStep("setup");
      setTwoFACode("");
      setTwoFAUri("");
      setRecoveryCodes([]);
    }
    setShow2FAModal(true);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: paddingTop,
          paddingBottom: tabBarHeight + Spacing.xl,
        },
      ]}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <View style={styles.header}>
        <Pressable onPress={handlePickPhoto} testID="button-upload-photo">
          {photoData?.photo?.url ? (
            <Image
              source={{ uri: photoData.photo.url }}
              style={{ width: 80, height: 80, borderRadius: 40 }}
            />
          ) : (
            <Avatar name={user?.fullName || "User"} size={80} />
          )}
          <View style={[styles.photoEditBadge, { backgroundColor: theme.primary }]}>
            <Feather name="camera" size={14} color="#fff" />
          </View>
        </Pressable>
        {photoData?.photo ? (
          <View style={[styles.photoStatusBadge, {
            backgroundColor: photoData.photo.status === "approved" ? "#10b98120" :
              photoData.photo.status === "rejected" ? "#ef444420" : "#f59e0b20"
          }]}>
            <ThemedText style={{
              fontSize: 11,
              fontWeight: "600",
              color: photoData.photo.status === "approved" ? "#10b981" :
                photoData.photo.status === "rejected" ? "#ef4444" : "#f59e0b"
            }}>
              {photoData.photo.status === "approved" ? "Photo Approved" :
                photoData.photo.status === "rejected" ? "Photo Rejected" : "Photo Under Review"}
            </ThemedText>
          </View>
        ) : (
          <ThemedText style={{ fontSize: 11, color: theme.warning, marginTop: Spacing.xs }}>
            Photo required
          </ThemedText>
        )}
        {uploadPhotoMutation.isPending ? (
          <ThemedText style={{ fontSize: 11, color: theme.textSecondary, marginTop: 2 }}>
            Uploading...
          </ThemedText>
        ) : null}
        <ThemedText type="h2" style={styles.name}>
          {user?.fullName}
        </ThemedText>
        <ThemedText style={[styles.email, { color: theme.textSecondary }]}>
          {user?.email}
        </ThemedText>
        <View
          style={[
            styles.roleBadge,
            { backgroundColor: theme.primary + "15" },
          ]}
        >
          <ThemedText style={[styles.roleText, { color: theme.primary }]}>
            {roleLabels[user?.role || "client"]}
          </ThemedText>
        </View>
      </View>

      {user?.role === "client" ? (
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Business Profile
          </ThemedText>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Pressable
              onPress={() => setShowClientTypeModal(true)}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && { backgroundColor: theme.backgroundSecondary },
                { borderBottomWidth: 1, borderBottomColor: theme.border },
              ]}
            >
              <View style={styles.menuItemContent}>
                <View style={styles.menuItemLeft}>
                  <Feather name="briefcase" size={20} color={theme.text} />
                  <ThemedText style={styles.menuItemText}>Business Type</ThemedText>
                </View>
                <View style={styles.menuItemRight}>
                  <ThemedText style={[styles.menuItemValue, { color: user.clientType ? theme.primary : theme.textSecondary }]}>
                    {user.clientType || "Not Set"}
                  </ThemedText>
                  <Feather name="chevron-right" size={20} color={theme.textMuted} />
                </View>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setShowBusinessDetailsModal(true)}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <View style={styles.menuItemContent}>
                <View style={styles.menuItemLeft}>
                  <Feather name="edit-3" size={20} color={theme.text} />
                  <ThemedText style={styles.menuItemText}>Business Details</ThemedText>
                </View>
                <View style={styles.menuItemRight}>
                  <ThemedText style={[styles.menuItemValue, { color: theme.textSecondary }]}>
                    {user.businessName ? "Edit" : "Add"}
                  </ThemedText>
                  <Feather name="chevron-right" size={20} color={theme.textMuted} />
                </View>
              </View>
            </Pressable>
          </View>
        </View>
      ) : null}

      {user?.role === "worker" ? (
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            Payment Information
          </ThemedText>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <Pressable
              onPress={handleOpenPaymentModal}
              style={({ pressed }) => [
                styles.menuItem,
                pressed && { backgroundColor: theme.backgroundSecondary },
              ]}
              testID="button-payment-info"
            >
              <View style={styles.menuItemContent}>
                <View style={styles.menuItemLeft}>
                  <Feather name="credit-card" size={20} color={theme.text} />
                  <View>
                    <ThemedText style={styles.menuItemText}>Banking Details</ThemedText>
                    {paymentProfile?.bankName ? (
                      <ThemedText style={[styles.paymentStatus, { color: theme.success }]}>
                        Payment details configured
                      </ThemedText>
                    ) : (
                      <ThemedText style={[styles.paymentStatus, { color: theme.warning || "#F59E0B" }]}>
                        Not configured - tap to set up
                      </ThemedText>
                    )}
                  </View>
                </View>
                <View style={styles.menuItemRight}>
                  <Feather name="chevron-right" size={20} color={theme.textMuted} />
                </View>
              </View>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Security
        </ThemedText>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Pressable
            onPress={handleOpen2FA}
            style={({ pressed }) => [
              styles.menuItem,
              pressed && { backgroundColor: theme.backgroundSecondary },
            ]}
            testID="button-2fa-settings"
          >
            <View style={styles.menuItemContent}>
              <View style={styles.menuItemLeft}>
                <Feather name="shield" size={20} color={theme.text} />
                <View>
                  <ThemedText style={styles.menuItemText}>
                    Two-Factor Authentication
                  </ThemedText>
                  <ThemedText style={{ fontSize: 12, color: twoFAStatus?.enabled ? "#10b981" : theme.textMuted }}>
                    {twoFAStatus?.enabled ? "Enabled" : "Not enabled"}
                  </ThemedText>
                </View>
              </View>
              <Feather name="chevron-right" size={20} color={theme.textMuted} />
            </View>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          Settings
        </ThemedText>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <View style={[styles.menuItem, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
            <View style={styles.menuItemContent}>
              <View style={styles.menuItemLeft}>
                <Feather name="bell" size={20} color={theme.text} />
                <ThemedText style={styles.menuItemText}>
                  Notifications
                </ThemedText>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              pressed && { backgroundColor: theme.backgroundSecondary },
              { borderBottomWidth: 1, borderBottomColor: theme.border },
            ]}
          >
            <View style={styles.menuItemContent}>
              <View style={styles.menuItemLeft}>
                <Feather name="globe" size={20} color={theme.text} />
                <ThemedText style={styles.menuItemText}>
                  Timezone
                </ThemedText>
              </View>
              <View style={styles.menuItemRight}>
                <ThemedText style={[styles.menuItemValue, { color: theme.textSecondary }]}>
                  {user?.timezone || "America/Toronto"}
                </ThemedText>
                <Feather name="chevron-right" size={20} color={theme.textMuted} />
              </View>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              pressed && { backgroundColor: theme.backgroundSecondary },
              { borderBottomWidth: 1, borderBottomColor: theme.border },
            ]}
          >
            <View style={styles.menuItemContent}>
              <View style={styles.menuItemLeft}>
                <Feather name="info" size={20} color={theme.text} />
                <ThemedText style={styles.menuItemText}>
                  About
                </ThemedText>
              </View>
              <View style={styles.menuItemRight}>
                <ThemedText style={[styles.menuItemValue, { color: theme.textSecondary }]}>
                  v1.0.0
                </ThemedText>
                <Feather name="chevron-right" size={20} color={theme.textMuted} />
              </View>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              pressed && { backgroundColor: theme.backgroundSecondary },
            ]}
            onPress={() => navigation.navigate("Diagnostics")}
            testID="button-diagnostics"
          >
            <View style={styles.menuItemContent}>
              <View style={styles.menuItemLeft}>
                <Feather name="activity" size={20} color={theme.text} />
                <ThemedText style={styles.menuItemText}>
                  Diagnostics
                </ThemedText>
              </View>
              <View style={styles.menuItemRight}>
                <Feather name="chevron-right" size={20} color={theme.textMuted} />
              </View>
            </View>
          </Pressable>
        </View>
      </View>

      {user?.role === "admin" ? (
        <View style={{ marginTop: Spacing.xl }}>
          <ThemedText style={[styles.sectionLabel, { color: "#ef4444" }]}>DANGER ZONE</ThemedText>
          <View style={[styles.card, { backgroundColor: theme.surface, borderWidth: 1, borderColor: "#ef444440" }]}>
            <Pressable
              onPress={handleOpenTrialReset}
              style={[styles.menuItem]}
              testID="button-trial-reset"
            >
              <View style={styles.menuItemContent}>
                <View style={styles.menuItemLeft}>
                  <Feather name="alert-triangle" size={20} color="#ef4444" />
                  <View>
                    <ThemedText style={[styles.menuItemText, { color: "#ef4444" }]}>Reset Trial Data</ThemedText>
                    <ThemedText style={{ fontSize: 12, color: theme.textMuted }}>Remove all non-admin data</ThemedText>
                  </View>
                </View>
                <Feather name="chevron-right" size={20} color="#ef4444" />
              </View>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.logoutSection}>
        <Button onPress={handleLogout} style={[styles.logoutButton, { backgroundColor: theme.error }]}>
          Sign Out
        </Button>
      </View>

      <Modal
        visible={showClientTypeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClientTypeModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowClientTypeModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <ThemedText type="h3" style={styles.modalTitle}>Select Business Type</ThemedText>
            {CLIENT_TYPES.map((type, index) => (
              <Pressable
                key={type}
                onPress={() => handleSelectClientType(type)}
                style={({ pressed }) => [
                  styles.modalOption,
                  pressed && { backgroundColor: theme.backgroundSecondary },
                  index < CLIENT_TYPES.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                ]}
              >
                <ThemedText style={styles.modalOptionText}>{type}</ThemedText>
                {user?.clientType === type ? (
                  <Feather name="check" size={20} color={theme.primary} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showBusinessDetailsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBusinessDetailsModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowBusinessDetailsModal(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <ThemedText type="h3" style={styles.modalTitle}>Business Details</ThemedText>
            
            <View style={styles.inputGroup}>
              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Business Name</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
                placeholder="Enter business name"
                placeholderTextColor={theme.textSecondary}
                value={businessName}
                onChangeText={setBusinessName}
                testID="input-business-name"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Business Address</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
                placeholder="Enter business address"
                placeholderTextColor={theme.textSecondary}
                value={businessAddress}
                onChangeText={setBusinessAddress}
                testID="input-business-address"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Business Phone</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
                placeholder="Enter phone number"
                placeholderTextColor={theme.textSecondary}
                value={businessPhone}
                onChangeText={setBusinessPhone}
                keyboardType="phone-pad"
                testID="input-business-phone"
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable 
                onPress={() => setShowBusinessDetailsModal(false)}
                style={[styles.modalButton, { backgroundColor: theme.border }]}
              >
                <ThemedText>Cancel</ThemedText>
              </Pressable>
              <Pressable 
                onPress={handleSaveBusinessDetails}
                style={[styles.modalButton, { backgroundColor: theme.primary }]}
              >
                <ThemedText style={{ color: "#fff" }}>Save</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showPaymentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowPaymentModal(false)}
        >
          <Pressable style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <ThemedText type="h3" style={styles.modalTitle}>Payment Information</ThemedText>
            
            <ScrollView style={{ maxHeight: 450 }} showsVerticalScrollIndicator={false}>
              <ThemedText style={[{ fontSize: 15, fontWeight: "600", marginBottom: 4 }]}>Direct Deposit</ThemedText>
              <ThemedText style={[styles.paymentStatus, { color: theme.textSecondary, marginBottom: Spacing.md }]}>
                Bank account details for receiving payments
              </ThemedText>
              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Bank Name</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
                  placeholder="e.g. TD Canada Trust"
                  placeholderTextColor={theme.textSecondary}
                  value={bankName}
                  onChangeText={setBankName}
                  testID="input-bank-name"
                />
              </View>
              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Institution Number (3 digits)</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
                  placeholder="e.g. 004"
                  placeholderTextColor={theme.textSecondary}
                  value={bankInstitution}
                  onChangeText={setBankInstitution}
                  keyboardType="number-pad"
                  maxLength={3}
                  testID="input-bank-institution"
                />
              </View>
              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Transit Number (5 digits)</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
                  placeholder="e.g. 12345"
                  placeholderTextColor={theme.textSecondary}
                  value={bankTransit}
                  onChangeText={setBankTransit}
                  keyboardType="number-pad"
                  maxLength={5}
                  testID="input-bank-transit"
                />
              </View>
              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>Account Number (7-12 digits)</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
                  placeholder="e.g. 1234567"
                  placeholderTextColor={theme.textSecondary}
                  value={bankAccount}
                  onChangeText={setBankAccount}
                  keyboardType="number-pad"
                  maxLength={12}
                  testID="input-bank-account"
                />
              </View>

              <View style={{ height: 1, backgroundColor: theme.border, marginVertical: Spacing.lg }} />

              <ThemedText style={[{ fontSize: 15, fontWeight: "600", marginBottom: 4 }]}>Interac E-Transfer</ThemedText>
              <ThemedText style={[styles.paymentStatus, { color: theme.textSecondary, marginBottom: Spacing.md }]}>
                Email for receiving E-Transfer payments
              </ThemedText>
              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>E-Transfer Email</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text }]}
                  placeholder="your.email@example.com"
                  placeholderTextColor={theme.textSecondary}
                  value={etransferEmail}
                  onChangeText={setEtransferEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  testID="input-etransfer-email"
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable 
                onPress={() => setShowPaymentModal(false)}
                style={[styles.modalButton, { backgroundColor: theme.border }]}
              >
                <ThemedText>Cancel</ThemedText>
              </Pressable>
              <Pressable 
                onPress={handleSavePayment}
                style={[styles.modalButton, { backgroundColor: theme.primary, opacity: (!bankName || !bankInstitution || !bankTransit || !bankAccount || !etransferEmail || savePaymentMutation.isPending) ? 0.5 : 1 }]}
                disabled={!bankName || !bankInstitution || !bankTransit || !bankAccount || !etransferEmail || savePaymentMutation.isPending}
              >
                <ThemedText style={{ color: "#fff" }}>{savePaymentMutation.isPending ? "Saving..." : "Save"}</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showTrialResetModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTrialResetModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowTrialResetModal(false)}
        >
          <Pressable
            style={[styles.modalContent, { backgroundColor: theme.surface, maxHeight: 500 }]}
            onPress={() => {}}
          >
            {trialResetStep === "preview" ? (
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: Spacing.md }}>
                  <Feather name="alert-triangle" size={24} color="#ef4444" />
                  <ThemedText type="h3" style={{ color: "#ef4444" }}>Reset Trial Data</ThemedText>
                </View>
                <ThemedText style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: Spacing.lg }}>
                  This will permanently delete all non-admin data including users, shifts, timesheets, messages, and more. Admin accounts will be preserved.
                </ThemedText>
                <View style={styles.modalActions}>
                  <Pressable
                    onPress={() => setShowTrialResetModal(false)}
                    style={[styles.modalButton, { backgroundColor: theme.border }]}
                  >
                    <ThemedText>Cancel</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => dryRunMutation.mutate()}
                    style={[styles.modalButton, { backgroundColor: "#ef4444", opacity: dryRunMutation.isPending ? 0.5 : 1 }]}
                    disabled={dryRunMutation.isPending}
                  >
                    <ThemedText style={{ color: "#fff" }}>{dryRunMutation.isPending ? "Scanning..." : "Preview Impact"}</ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : trialResetStep === "confirm" && dryRunData ? (
              <ScrollView style={{ maxHeight: 400 }}>
                <ThemedText type="h3" style={{ marginBottom: Spacing.sm, color: "#ef4444" }}>Impact Preview</ThemedText>
                <ThemedText style={{ color: theme.textSecondary, fontSize: 13, marginBottom: Spacing.md }}>
                  Total records to delete: {dryRunData.totalRecords} | Admin accounts preserved: {dryRunData.adminUsersPreserved}
                </ThemedText>
                {Object.entries(dryRunData.counts as Record<string, number>)
                  .filter(([k]) => k !== "admin_users_preserved")
                  .filter(([, v]) => (v as number) > 0)
                  .map(([table, count]) => (
                    <View key={table} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                      <ThemedText style={{ fontSize: 13, color: theme.textSecondary }}>{table.replace(/_/g, " ")}</ThemedText>
                      <ThemedText style={{ fontSize: 13, fontWeight: "600", color: "#ef4444" }}>{String(count)}</ThemedText>
                    </View>
                  ))}
                <View style={{ marginTop: Spacing.lg }}>
                  <ThemedText style={{ fontSize: 13, color: theme.textSecondary, marginBottom: Spacing.xs }}>Type RESET TRIAL DATA to confirm:</ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderWidth: 1, borderColor: "#ef444440" }]}
                    value={confirmPhrase}
                    onChangeText={setConfirmPhrase}
                    placeholder="RESET TRIAL DATA"
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="characters"
                    testID="input-confirm-reset"
                  />
                </View>
                <View style={[styles.modalActions, { marginTop: Spacing.md }]}>
                  <Pressable
                    onPress={() => setShowTrialResetModal(false)}
                    style={[styles.modalButton, { backgroundColor: theme.border }]}
                  >
                    <ThemedText>Cancel</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => executeResetMutation.mutate()}
                    style={[styles.modalButton, { backgroundColor: "#ef4444", opacity: confirmPhrase !== "RESET TRIAL DATA" || executeResetMutation.isPending ? 0.5 : 1 }]}
                    disabled={confirmPhrase !== "RESET TRIAL DATA" || executeResetMutation.isPending}
                    testID="button-execute-reset"
                  >
                    <ThemedText style={{ color: "#fff" }}>{executeResetMutation.isPending ? "Resetting..." : "Execute Reset"}</ThemedText>
                  </Pressable>
                </View>
              </ScrollView>
            ) : trialResetStep === "done" ? (
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: Spacing.md }}>
                  <Feather name="check-circle" size={24} color="#22c55e" />
                  <ThemedText type="h3">Reset Complete</ThemedText>
                </View>
                <ThemedText style={{ color: theme.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: Spacing.lg }}>
                  {resetResult?.message || "All trial data has been cleared. Admin accounts are preserved."}
                </ThemedText>
                <Pressable
                  onPress={() => setShowTrialResetModal(false)}
                  style={[styles.modalButton, { backgroundColor: theme.primary, alignSelf: "flex-end" }]}
                >
                  <ThemedText style={{ color: "#fff" }}>Done</ThemedText>
                </Pressable>
              </View>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={show2FAModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShow2FAModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: Spacing.xl }}>
          <View style={{ backgroundColor: theme.backgroundSecondary, borderRadius: BorderRadius.xl, padding: Spacing.xl, maxHeight: "80%" }}>
            {twoFAStep === "setup" ? (
              <>
                <View style={{ alignItems: "center", marginBottom: Spacing.lg }}>
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.primary + "15", alignItems: "center", justifyContent: "center", marginBottom: Spacing.md }}>
                    <Feather name="shield" size={28} color={theme.primary} />
                  </View>
                  <ThemedText type="h3" style={{ textAlign: "center", marginBottom: Spacing.sm }}>
                    Enable Two-Factor Authentication
                  </ThemedText>
                  <ThemedText style={{ textAlign: "center", color: theme.textSecondary, fontSize: 14 }}>
                    Add an extra layer of security to your account using an authenticator app like Google Authenticator or Microsoft Authenticator.
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => setup2FAMutation.mutate()}
                  style={{ backgroundColor: theme.primary, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, alignItems: "center" }}
                  testID="button-start-2fa-setup"
                >
                  {setup2FAMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={{ color: "#fff", fontWeight: "600" }}>Get Started</ThemedText>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setShow2FAModal(false)}
                  style={{ paddingVertical: Spacing.md, alignItems: "center", marginTop: Spacing.sm }}
                >
                  <ThemedText style={{ color: theme.textSecondary }}>Cancel</ThemedText>
                </Pressable>
              </>
            ) : twoFAStep === "verify" ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ alignItems: "center", marginBottom: Spacing.lg }}>
                  <ThemedText type="h3" style={{ textAlign: "center", marginBottom: Spacing.md }}>
                    Scan QR Code
                  </ThemedText>
                  <ThemedText style={{ textAlign: "center", color: theme.textSecondary, fontSize: 14, marginBottom: Spacing.lg }}>
                    Open your authenticator app and scan this QR code to add your account.
                  </ThemedText>
                  {twoFAUri ? (
                    <View style={{ padding: Spacing.lg, backgroundColor: "#fff", borderRadius: BorderRadius.lg, marginBottom: Spacing.lg }}>
                      <QRCode value={twoFAUri} size={200} />
                    </View>
                  ) : null}
                  <ThemedText style={{ textAlign: "center", color: theme.textSecondary, fontSize: 13, marginBottom: Spacing.lg }}>
                    Enter the 6-digit code from your authenticator app to verify setup.
                  </ThemedText>
                </View>
                <TextInput
                  value={twoFACode}
                  onChangeText={setTwoFACode}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={{
                    backgroundColor: theme.backgroundTertiary,
                    color: theme.text,
                    fontSize: 24,
                    fontWeight: "700",
                    textAlign: "center",
                    letterSpacing: 8,
                    paddingVertical: Spacing.md,
                    borderRadius: BorderRadius.lg,
                    marginBottom: Spacing.lg,
                  }}
                  testID="input-2fa-code"
                />
                {verify2FAMutation.isError ? (
                  <ThemedText style={{ color: theme.error, textAlign: "center", marginBottom: Spacing.md, fontSize: 13 }}>
                    Invalid code. Please try again.
                  </ThemedText>
                ) : null}
                <Pressable
                  onPress={() => verify2FAMutation.mutate(twoFACode)}
                  disabled={twoFACode.length !== 6 || verify2FAMutation.isPending}
                  style={{
                    backgroundColor: twoFACode.length === 6 ? theme.primary : theme.backgroundTertiary,
                    paddingVertical: Spacing.md,
                    borderRadius: BorderRadius.lg,
                    alignItems: "center",
                    opacity: twoFACode.length === 6 ? 1 : 0.5,
                  }}
                  testID="button-verify-2fa"
                >
                  {verify2FAMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={{ color: twoFACode.length === 6 ? "#fff" : theme.textMuted, fontWeight: "600" }}>Verify & Enable</ThemedText>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setShow2FAModal(false)}
                  style={{ paddingVertical: Spacing.md, alignItems: "center", marginTop: Spacing.sm }}
                >
                  <ThemedText style={{ color: theme.textSecondary }}>Cancel</ThemedText>
                </Pressable>
              </ScrollView>
            ) : twoFAStep === "recovery" ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ alignItems: "center", marginBottom: Spacing.lg }}>
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#10b98115", alignItems: "center", justifyContent: "center", marginBottom: Spacing.md }}>
                    <Feather name="check-circle" size={28} color="#10b981" />
                  </View>
                  <ThemedText type="h3" style={{ textAlign: "center", marginBottom: Spacing.sm }}>
                    2FA Enabled
                  </ThemedText>
                  <ThemedText style={{ textAlign: "center", color: theme.textSecondary, fontSize: 14, marginBottom: Spacing.lg }}>
                    Save these recovery codes in a safe place. You can use them to access your account if you lose your authenticator device.
                  </ThemedText>
                </View>
                <View style={{ backgroundColor: theme.backgroundTertiary, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg }}>
                  {recoveryCodes.map((code, i) => (
                    <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}>
                      <ThemedText style={{ fontFamily: "monospace", fontSize: 15, fontWeight: "600" }}>{code}</ThemedText>
                      <ThemedText style={{ color: theme.textMuted, fontSize: 12 }}>#{i + 1}</ThemedText>
                    </View>
                  ))}
                </View>
                <ThemedText style={{ textAlign: "center", color: "#f59e0b", fontSize: 12, marginBottom: Spacing.lg }}>
                  Each code can only be used once. Store them securely.
                </ThemedText>
                <Pressable
                  onPress={() => setShow2FAModal(false)}
                  style={{ backgroundColor: theme.primary, paddingVertical: Spacing.md, borderRadius: BorderRadius.lg, alignItems: "center" }}
                  testID="button-done-2fa"
                >
                  <ThemedText style={{ color: "#fff", fontWeight: "600" }}>Done</ThemedText>
                </Pressable>
              </ScrollView>
            ) : twoFAStep === "disable" ? (
              <>
                <View style={{ alignItems: "center", marginBottom: Spacing.lg }}>
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "#ef444415", alignItems: "center", justifyContent: "center", marginBottom: Spacing.md }}>
                    <Feather name="shield-off" size={28} color="#ef4444" />
                  </View>
                  <ThemedText type="h3" style={{ textAlign: "center", marginBottom: Spacing.sm }}>
                    Disable Two-Factor Authentication
                  </ThemedText>
                  <ThemedText style={{ textAlign: "center", color: theme.textSecondary, fontSize: 14 }}>
                    Enter your current authenticator code to disable 2FA. This will make your account less secure.
                  </ThemedText>
                </View>
                <TextInput
                  value={twoFADisableCode}
                  onChangeText={setTwoFADisableCode}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={{
                    backgroundColor: theme.backgroundTertiary,
                    color: theme.text,
                    fontSize: 24,
                    fontWeight: "700",
                    textAlign: "center",
                    letterSpacing: 8,
                    paddingVertical: Spacing.md,
                    borderRadius: BorderRadius.lg,
                    marginBottom: Spacing.lg,
                  }}
                  testID="input-2fa-disable-code"
                />
                {disable2FAMutation.isError ? (
                  <ThemedText style={{ color: theme.error, textAlign: "center", marginBottom: Spacing.md, fontSize: 13 }}>
                    Invalid code. Please try again.
                  </ThemedText>
                ) : null}
                <Pressable
                  onPress={() => disable2FAMutation.mutate(twoFADisableCode)}
                  disabled={twoFADisableCode.length !== 6 || disable2FAMutation.isPending}
                  style={{
                    backgroundColor: twoFADisableCode.length === 6 ? "#ef4444" : theme.backgroundTertiary,
                    paddingVertical: Spacing.md,
                    borderRadius: BorderRadius.lg,
                    alignItems: "center",
                    opacity: twoFADisableCode.length === 6 ? 1 : 0.5,
                  }}
                  testID="button-confirm-disable-2fa"
                >
                  {disable2FAMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={{ color: twoFADisableCode.length === 6 ? "#fff" : theme.textMuted, fontWeight: "600" }}>Disable 2FA</ThemedText>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setShow2FAModal(false)}
                  style={{ paddingVertical: Spacing.md, alignItems: "center", marginTop: Spacing.sm }}
                >
                  <ThemedText style={{ color: theme.textSecondary }}>Cancel</ThemedText>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing["3xl"],
  },
  name: {
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  email: {
    marginTop: Spacing.xs,
    fontSize: 14,
  },
  roleBadge: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  roleText: {
    fontSize: 13,
    fontWeight: "600",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginLeft: Spacing.xs,
  },
  card: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  menuItem: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  menuItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  menuItemText: {
    fontSize: 16,
  },
  menuItemValue: {
    fontSize: 14,
  },
  paymentStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  paymentMethodOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  logoutSection: {
    marginTop: Spacing.lg,
  },
  logoutButton: {
    marginBottom: Spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  modalTitle: {
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  modalOptionText: {
    fontSize: 16,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    marginBottom: Spacing.xs,
  },
  input: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  modalButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  photoEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  photoStatusBadge: {
    marginTop: Spacing.xs,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
});
