import React, { useState } from "react";
import { View, StyleSheet, Pressable, Switch, ScrollView, TextInput, Modal } from "react-native";
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

  const queryClient = useQueryClient();
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
        <Avatar name={user?.fullName} role={user?.role} size={80} />
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
});
