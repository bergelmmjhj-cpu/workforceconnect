import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkerOnboarding } from "@/contexts/WorkerOnboardingContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { createWorkerApplication } from "@/storage";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";
import { AddressAutocomplete, type AddressData } from "@/components/AddressAutocomplete";
import type { WorkerApplicationAddress } from "@/types";
import { WORKER_ROLES } from "@/types";
import { getErrorMessage } from "@/utils/errorHandler";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface FormSection {
  id: string;
  title: string;
  icon: keyof typeof Feather.glyphMap;
}

const SECTIONS: FormSection[] = [
  { id: "personal", title: "A. Personal Details", icon: "user" },
  { id: "eligibility", title: "B. Work Eligibility", icon: "shield" },
  { id: "roles", title: "C. Role Interests", icon: "briefcase" },
  { id: "experience", title: "D. Experience & Skills", icon: "award" },
  { id: "availability", title: "E. Availability", icon: "calendar" },
  { id: "emergency", title: "F. Emergency Contact", icon: "phone" },
  { id: "preferences", title: "G. Preferences", icon: "settings" },
  { id: "declarations", title: "H. Declarations", icon: "check-square" },
];

const ROLE_OPTIONS = [...WORKER_ROLES];

const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SHIFT_TYPE_OPTIONS = ["day", "evening", "overnight", "weekends"];

export default function WorkerApplicationFormScreen() {
  const { theme } = useTheme();
  const { user, updateOnboardingStatus } = useAuth();
  const { refreshOnboardingData } = useWorkerOnboarding();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<NavigationProp>();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["personal"]));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddressSelected, setIsAddressSelected] = useState(false);

  const [formData, setFormData] = useState<{
    legalFirstName: string;
    legalLastName: string;
    preferredName: string;
    pronouns: string;
    mobilePhone: string;
    emailAddress: string;
    street: string;
    city: string;
    provinceState: string;
    postalZip: string;
    country: string;
    primaryLanguage: string;
    otherLanguages: string;
    timeZone: string;
    legallyEligibleToWork: boolean;
    workAuthorizationType: string;
    hasGovernmentPhotoId: boolean;
    hasDriversLicense: boolean;
    driversLicenseProvinceClass: string;
    backgroundCheckConsent: "consent" | "do_not_consent";
    rolesInterestedIn: string[];
    rolesInterestedOtherText: string;
    preferredWorkType: "full_time" | "part_time" | "casual_on_call";
    weeklyAvailabilityDays: string[];
    dailyTimeWindows: string;
    earliestStartDate: string;
    distanceWillingToTravelKm: number;
    reliableTransportation: "yes" | "no" | "sometimes";
    yearsExperiencePrimaryRole: number;
    relatedExperienceSummary: string;
    relevantSkills: string[];
    equipmentOperationText: string;
    shiftTypes: string[];
    minHoursPerShift: number;
    maxHoursPerWeekPreference: number;
    hourlyPayExpectation: number;
    emergencyContactName: string;
    emergencyContactRelationship: string;
    emergencyContactPhone: string;
    emergencyContactAlt: string;
    preferredContactChannels: string[];
    consentOperationalMessages: boolean;
    acknowledgeTitoAccuracyUtc: boolean;
    acknowledgeSiteRulesSafety: boolean;
    preAcknowledgeAgreementRequired: boolean;
    consentDataProcessing: boolean;
    optionalGpsAcknowledgement: boolean;
    declareTrueComplete: boolean;
    declareFalseInfoConsequences: boolean;
    electronicSignatureFullLegalName: string;
    dateLocal: string;
  }>({
    legalFirstName: "",
    legalLastName: "",
    preferredName: "",
    pronouns: "",
    mobilePhone: "",
    emailAddress: user?.email || "",
    street: "",
    city: "",
    provinceState: "",
    postalZip: "",
    country: "Canada",
    primaryLanguage: "English",
    otherLanguages: "",
    timeZone: "America/Toronto",
    legallyEligibleToWork: true,
    workAuthorizationType: "",
    hasGovernmentPhotoId: false,
    hasDriversLicense: false,
    driversLicenseProvinceClass: "",
    backgroundCheckConsent: "consent",
    rolesInterestedIn: [],
    rolesInterestedOtherText: "",
    preferredWorkType: "part_time",
    weeklyAvailabilityDays: [],
    dailyTimeWindows: "",
    earliestStartDate: new Date().toISOString().split("T")[0],
    distanceWillingToTravelKm: 25,
    reliableTransportation: "yes",
    yearsExperiencePrimaryRole: 0,
    relatedExperienceSummary: "",
    relevantSkills: [],
    equipmentOperationText: "",
    shiftTypes: [],
    minHoursPerShift: 4,
    maxHoursPerWeekPreference: 40,
    hourlyPayExpectation: 20,
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactPhone: "",
    emergencyContactAlt: "",
    preferredContactChannels: ["email"],
    consentOperationalMessages: true,
    acknowledgeTitoAccuracyUtc: false,
    acknowledgeSiteRulesSafety: false,
    preAcknowledgeAgreementRequired: false,
    consentDataProcessing: false,
    optionalGpsAcknowledgement: false,
    declareTrueComplete: false,
    declareFalseInfoConsequences: false,
    electronicSignatureFullLegalName: "",
    dateLocal: new Date().toISOString().split("T")[0],
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const toggleArrayItem = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => {
      const arr = prev[field] as string[];
      const newArr = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, [field]: newArr };
    });
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!formData.legalFirstName || !formData.legalLastName) {
      Alert.alert("Required", "Please enter your legal first and last name.");
      return;
    }
    if (!formData.mobilePhone) {
      Alert.alert("Required", "Please enter your mobile phone number.");
      return;
    }
    if (!formData.emailAddress) {
      Alert.alert("Required", "Please enter your email address.");
      return;
    }
    if (!formData.emergencyContactName || !formData.emergencyContactPhone) {
      Alert.alert("Required", "Please provide emergency contact information.");
      return;
    }
    if (!formData.declareTrueComplete || !formData.declareFalseInfoConsequences) {
      Alert.alert("Required", "Please complete the declarations section.");
      return;
    }
    if (!formData.electronicSignatureFullLegalName) {
      Alert.alert("Required", "Please provide your electronic signature.");
      return;
    }

    setIsSubmitting(true);

    try {
      const currentAddress: WorkerApplicationAddress = {
        street: formData.street,
        city: formData.city,
        provinceState: formData.provinceState,
        postalZip: formData.postalZip,
        country: formData.country,
      };

      await createWorkerApplication({
        workerId: user.id,
        source: "mobile_app",
        legalFirstName: formData.legalFirstName,
        legalLastName: formData.legalLastName,
        preferredName: formData.preferredName || undefined,
        pronouns: formData.pronouns || undefined,
        mobilePhone: formData.mobilePhone,
        emailAddress: formData.emailAddress,
        currentAddress,
        primaryLanguage: formData.primaryLanguage,
        otherLanguages: formData.otherLanguages || undefined,
        timeZone: formData.timeZone,
        legallyEligibleToWork: formData.legallyEligibleToWork,
        workAuthorizationType: formData.workAuthorizationType || undefined,
        hasGovernmentPhotoId: formData.hasGovernmentPhotoId,
        hasDriversLicense: formData.hasDriversLicense,
        driversLicenseProvinceClass: formData.driversLicenseProvinceClass || undefined,
        backgroundCheckConsent: formData.backgroundCheckConsent,
        rolesInterestedIn: formData.rolesInterestedIn,
        rolesInterestedOtherText: formData.rolesInterestedOtherText || undefined,
        preferredWorkType: formData.preferredWorkType,
        weeklyAvailabilityDays: formData.weeklyAvailabilityDays,
        dailyTimeWindows: formData.dailyTimeWindows || undefined,
        earliestStartDate: formData.earliestStartDate,
        distanceWillingToTravelKm: formData.distanceWillingToTravelKm,
        reliableTransportation: formData.reliableTransportation,
        yearsExperiencePrimaryRole: formData.yearsExperiencePrimaryRole,
        relatedExperienceSummary: formData.relatedExperienceSummary,
        relevantSkills: formData.relevantSkills,
        equipmentOperationText: formData.equipmentOperationText || undefined,
        shiftTypes: formData.shiftTypes,
        minHoursPerShift: formData.minHoursPerShift,
        maxHoursPerWeekPreference: formData.maxHoursPerWeekPreference,
        hourlyPayExpectation: formData.hourlyPayExpectation,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactRelationship: formData.emergencyContactRelationship,
        emergencyContactPhone: formData.emergencyContactPhone,
        emergencyContactAlt: formData.emergencyContactAlt || undefined,
        preferredContactChannels: formData.preferredContactChannels,
        consentOperationalMessages: formData.consentOperationalMessages,
        acknowledgeTitoAccuracyUtc: formData.acknowledgeTitoAccuracyUtc,
        acknowledgeSiteRulesSafety: formData.acknowledgeSiteRulesSafety,
        preAcknowledgeAgreementRequired: formData.preAcknowledgeAgreementRequired,
        verificationMethodAtSigningPlaceholder: "typed_name",
        consentDataProcessing: formData.consentDataProcessing,
        optionalGpsAcknowledgement: formData.optionalGpsAcknowledgement,
        privacyContactEmail: "privacy@company.com",
        declareTrueComplete: formData.declareTrueComplete,
        declareFalseInfoConsequences: formData.declareFalseInfoConsequences,
        electronicSignatureFullLegalName: formData.electronicSignatureFullLegalName,
        dateLocal: formData.dateLocal,
        formVersion: "v1.0",
        status: "submitted",
      });

      await updateOnboardingStatus("APPLICATION_SUBMITTED");
      await refreshOnboardingData();

      Alert.alert("Success", "Your application has been submitted!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Unable to Submit", getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCheckbox = (
    label: string,
    checked: boolean,
    onToggle: () => void,
    required?: boolean
  ) => (
    <Pressable style={styles.checkboxRow} onPress={onToggle}>
      <View
        style={[
          styles.checkbox,
          { borderColor: theme.border },
          checked && { backgroundColor: theme.primary, borderColor: theme.primary },
        ]}
      >
        {checked ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
      </View>
      <ThemedText style={styles.checkboxLabel}>
        {label}
        {required ? <ThemedText style={{ color: theme.error }}> *</ThemedText> : null}
      </ThemedText>
    </Pressable>
  );

  const renderChipSelect = (
    options: string[],
    selected: string[],
    field: keyof typeof formData
  ) => (
    <View style={styles.chipContainer}>
      {options.map((option) => (
        <Pressable
          key={option}
          style={[
            styles.chip,
            { borderColor: theme.border },
            selected.includes(option) && {
              backgroundColor: theme.primary,
              borderColor: theme.primary,
            },
          ]}
          onPress={() => toggleArrayItem(field, option)}
        >
          <ThemedText
            style={[
              styles.chipText,
              selected.includes(option) && { color: "#FFFFFF" },
            ]}
          >
            {option}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    options?: {
      required?: boolean;
      placeholder?: string;
      keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
      multiline?: boolean;
    }
  ) => (
    <View style={styles.inputGroup}>
      <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
        {label}
        {options?.required ? <ThemedText style={{ color: theme.error }}> *</ThemedText> : null}
      </ThemedText>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.inputBackground,
            borderColor: theme.border,
            color: theme.text,
          },
          options?.multiline && styles.multilineInput,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={options?.placeholder}
        placeholderTextColor={theme.textSecondary}
        keyboardType={options?.keyboardType}
        multiline={options?.multiline}
      />
    </View>
  );

  const renderSection = (section: FormSection) => {
    const isExpanded = expandedSections.has(section.id);

    return (
      <Card key={section.id} style={styles.sectionCard}>
        <Pressable style={styles.sectionHeader} onPress={() => toggleSection(section.id)}>
          <View style={styles.sectionTitleRow}>
            <Feather name={section.icon} size={20} color={theme.primary} />
            <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
          </View>
          <Feather
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={24}
            color={theme.textSecondary}
          />
        </Pressable>

        {isExpanded ? (
          <View style={styles.sectionContent}>
            {section.id === "personal" ? (
              <>
                {renderInput("Legal First Name", formData.legalFirstName, (v) =>
                  setFormData((p) => ({ ...p, legalFirstName: v })), { required: true }
                )}
                {renderInput("Legal Last Name", formData.legalLastName, (v) =>
                  setFormData((p) => ({ ...p, legalLastName: v })), { required: true }
                )}
                {renderInput("Preferred Name", formData.preferredName, (v) =>
                  setFormData((p) => ({ ...p, preferredName: v }))
                )}
                {renderInput("Pronouns", formData.pronouns, (v) =>
                  setFormData((p) => ({ ...p, pronouns: v })), { placeholder: "e.g., they/them" }
                )}
                {renderInput("Mobile Phone", formData.mobilePhone, (v) =>
                  setFormData((p) => ({ ...p, mobilePhone: v })),
                  { required: true, keyboardType: "phone-pad" }
                )}
                {renderInput("Email Address", formData.emailAddress, (v) =>
                  setFormData((p) => ({ ...p, emailAddress: v })),
                  { required: true, keyboardType: "email-address" }
                )}
                <ThemedText style={[styles.subsectionTitle, { color: theme.text }]}>
                  Current Address
                </ThemedText>
                <AddressAutocomplete
                  label="Search your address"
                  value={formData.street}
                  placeholder="Start typing your address..."
                  userRole={user?.role || "worker"}
                  userId={user?.id || ""}
                  isAddressSelected={isAddressSelected}
                  onAddressSelect={(address: AddressData) => {
                    setFormData((p) => ({
                      ...p,
                      street: address.addressLine1,
                      city: address.city,
                      provinceState: address.province,
                      postalZip: address.postalCode,
                      country: address.country || "Canada",
                    }));
                    setIsAddressSelected(true);
                  }}
                  onClear={() => {
                    setFormData((p) => ({
                      ...p,
                      street: "",
                      city: "",
                      provinceState: "",
                      postalZip: "",
                    }));
                    setIsAddressSelected(false);
                  }}
                />
                {isAddressSelected ? (
                  <View style={styles.addressPreview}>
                    <ThemedText style={[styles.addressPreviewLabel, { color: theme.textSecondary }]}>
                      Street: <ThemedText style={{ color: theme.text }}>{formData.street}</ThemedText>
                    </ThemedText>
                    <ThemedText style={[styles.addressPreviewLabel, { color: theme.textSecondary }]}>
                      City: <ThemedText style={{ color: theme.text }}>{formData.city}</ThemedText>
                    </ThemedText>
                    <ThemedText style={[styles.addressPreviewLabel, { color: theme.textSecondary }]}>
                      Province/State: <ThemedText style={{ color: theme.text }}>{formData.provinceState}</ThemedText>
                    </ThemedText>
                    <ThemedText style={[styles.addressPreviewLabel, { color: theme.textSecondary }]}>
                      Postal/Zip: <ThemedText style={{ color: theme.text }}>{formData.postalZip}</ThemedText>
                    </ThemedText>
                  </View>
                ) : null}
                {renderInput("Primary Language", formData.primaryLanguage, (v) =>
                  setFormData((p) => ({ ...p, primaryLanguage: v })), { required: true }
                )}
                {renderInput("Other Languages", formData.otherLanguages, (v) =>
                  setFormData((p) => ({ ...p, otherLanguages: v }))
                )}
              </>
            ) : null}

            {section.id === "eligibility" ? (
              <>
                {renderCheckbox(
                  "I am legally eligible to work in Canada",
                  formData.legallyEligibleToWork,
                  () => setFormData((p) => ({ ...p, legallyEligibleToWork: !p.legallyEligibleToWork })),
                  true
                )}
                {renderInput("Work Authorization Type", formData.workAuthorizationType, (v) =>
                  setFormData((p) => ({ ...p, workAuthorizationType: v })),
                  { placeholder: "e.g., Citizen, PR, Work Permit" }
                )}
                {renderCheckbox(
                  "I have a valid government photo ID",
                  formData.hasGovernmentPhotoId,
                  () => setFormData((p) => ({ ...p, hasGovernmentPhotoId: !p.hasGovernmentPhotoId })),
                  true
                )}
                {renderCheckbox(
                  "I have a driver's license",
                  formData.hasDriversLicense,
                  () => setFormData((p) => ({ ...p, hasDriversLicense: !p.hasDriversLicense }))
                )}
                {formData.hasDriversLicense ? renderInput(
                  "License Province & Class",
                  formData.driversLicenseProvinceClass,
                  (v) => setFormData((p) => ({ ...p, driversLicenseProvinceClass: v })),
                  { placeholder: "e.g., Ontario G" }
                ) : null}
                {renderCheckbox(
                  "I consent to a background check",
                  formData.backgroundCheckConsent === "consent",
                  () =>
                    setFormData((p) => ({
                      ...p,
                      backgroundCheckConsent:
                        p.backgroundCheckConsent === "consent" ? "do_not_consent" : "consent",
                    })),
                  true
                )}
              </>
            ) : null}

            {section.id === "roles" ? (
              <>
                <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  Roles Interested In *
                </ThemedText>
                {renderChipSelect(ROLE_OPTIONS, formData.rolesInterestedIn, "rolesInterestedIn")}
                {formData.rolesInterestedIn.includes("Other")
                  ? renderInput("Other Role", formData.rolesInterestedOtherText, (v) =>
                      setFormData((p) => ({ ...p, rolesInterestedOtherText: v }))
                    )
                  : null}
                <ThemedText style={[styles.inputLabel, { color: theme.textSecondary, marginTop: Spacing.md }]}>
                  Preferred Work Type *
                </ThemedText>
                <View style={styles.chipContainer}>
                  {(["full_time", "part_time", "casual_on_call"] as const).map((type) => (
                    <Pressable
                      key={type}
                      style={[
                        styles.chip,
                        { borderColor: theme.border },
                        formData.preferredWorkType === type && {
                          backgroundColor: theme.primary,
                          borderColor: theme.primary,
                        },
                      ]}
                      onPress={() => setFormData((p) => ({ ...p, preferredWorkType: type }))}
                    >
                      <ThemedText
                        style={[
                          styles.chipText,
                          formData.preferredWorkType === type && { color: "#FFFFFF" },
                        ]}
                      >
                        {type.replace(/_/g, " ")}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}

            {section.id === "experience" ? (
              <>
                {renderInput(
                  "Years of Experience",
                  formData.yearsExperiencePrimaryRole.toString(),
                  (v) => setFormData((p) => ({ ...p, yearsExperiencePrimaryRole: parseInt(v) || 0 })),
                  { required: true, keyboardType: "numeric" }
                )}
                {renderInput(
                  "Experience Summary",
                  formData.relatedExperienceSummary,
                  (v) => setFormData((p) => ({ ...p, relatedExperienceSummary: v })),
                  { required: true, multiline: true, placeholder: "Describe your relevant experience..." }
                )}
                {renderInput(
                  "Equipment Experience",
                  formData.equipmentOperationText,
                  (v) => setFormData((p) => ({ ...p, equipmentOperationText: v })),
                  { placeholder: "List equipment you can operate..." }
                )}
              </>
            ) : null}

            {section.id === "availability" ? (
              <>
                <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  Available Days *
                </ThemedText>
                {renderChipSelect(DAY_OPTIONS, formData.weeklyAvailabilityDays, "weeklyAvailabilityDays")}
                <ThemedText style={[styles.inputLabel, { color: theme.textSecondary, marginTop: Spacing.md }]}>
                  Shift Types *
                </ThemedText>
                {renderChipSelect(SHIFT_TYPE_OPTIONS, formData.shiftTypes, "shiftTypes")}
                {renderInput(
                  "Daily Time Windows",
                  formData.dailyTimeWindows,
                  (v) => setFormData((p) => ({ ...p, dailyTimeWindows: v })),
                  { placeholder: "e.g., 8:00 AM - 6:00 PM" }
                )}
                {renderInput(
                  "Earliest Start Date",
                  formData.earliestStartDate,
                  (v) => setFormData((p) => ({ ...p, earliestStartDate: v })),
                  { required: true, placeholder: "YYYY-MM-DD" }
                )}
                {renderInput(
                  "Distance Willing to Travel (km)",
                  formData.distanceWillingToTravelKm.toString(),
                  (v) => setFormData((p) => ({ ...p, distanceWillingToTravelKm: parseInt(v) || 0 })),
                  { keyboardType: "numeric" }
                )}
              </>
            ) : null}

            {section.id === "emergency" ? (
              <>
                {renderInput("Contact Name", formData.emergencyContactName, (v) =>
                  setFormData((p) => ({ ...p, emergencyContactName: v })), { required: true }
                )}
                {renderInput("Relationship", formData.emergencyContactRelationship, (v) =>
                  setFormData((p) => ({ ...p, emergencyContactRelationship: v })), { required: true }
                )}
                {renderInput("Phone", formData.emergencyContactPhone, (v) =>
                  setFormData((p) => ({ ...p, emergencyContactPhone: v })),
                  { required: true, keyboardType: "phone-pad" }
                )}
                {renderInput("Alternate Phone", formData.emergencyContactAlt, (v) =>
                  setFormData((p) => ({ ...p, emergencyContactAlt: v })),
                  { keyboardType: "phone-pad" }
                )}
              </>
            ) : null}

            {section.id === "preferences" ? (
              <>
                <ThemedText style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  Preferred Contact Channels *
                </ThemedText>
                {renderChipSelect(
                  ["email", "sms", "in_app"],
                  formData.preferredContactChannels,
                  "preferredContactChannels"
                )}
                {renderInput(
                  "Hourly Pay Expectation ($)",
                  formData.hourlyPayExpectation.toString(),
                  (v) => setFormData((p) => ({ ...p, hourlyPayExpectation: parseFloat(v) || 0 })),
                  { keyboardType: "numeric" }
                )}
                {renderCheckbox(
                  "I consent to receive operational messages",
                  formData.consentOperationalMessages,
                  () =>
                    setFormData((p) => ({
                      ...p,
                      consentOperationalMessages: !p.consentOperationalMessages,
                    })),
                  true
                )}
              </>
            ) : null}

            {section.id === "declarations" ? (
              <>
                {renderCheckbox(
                  "I acknowledge that TITO records must be accurate",
                  formData.acknowledgeTitoAccuracyUtc,
                  () =>
                    setFormData((p) => ({
                      ...p,
                      acknowledgeTitoAccuracyUtc: !p.acknowledgeTitoAccuracyUtc,
                    })),
                  true
                )}
                {renderCheckbox(
                  "I agree to follow site rules and safety protocols",
                  formData.acknowledgeSiteRulesSafety,
                  () =>
                    setFormData((p) => ({
                      ...p,
                      acknowledgeSiteRulesSafety: !p.acknowledgeSiteRulesSafety,
                    })),
                  true
                )}
                {renderCheckbox(
                  "I understand I will need to sign an agreement",
                  formData.preAcknowledgeAgreementRequired,
                  () =>
                    setFormData((p) => ({
                      ...p,
                      preAcknowledgeAgreementRequired: !p.preAcknowledgeAgreementRequired,
                    })),
                  true
                )}
                {renderCheckbox(
                  "I consent to data processing as described",
                  formData.consentDataProcessing,
                  () =>
                    setFormData((p) => ({
                      ...p,
                      consentDataProcessing: !p.consentDataProcessing,
                    })),
                  true
                )}
                {renderCheckbox(
                  "I acknowledge GPS verification for time tracking",
                  formData.optionalGpsAcknowledgement,
                  () =>
                    setFormData((p) => ({
                      ...p,
                      optionalGpsAcknowledgement: !p.optionalGpsAcknowledgement,
                    }))
                )}
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                {renderCheckbox(
                  "I declare all information is true and complete",
                  formData.declareTrueComplete,
                  () =>
                    setFormData((p) => ({
                      ...p,
                      declareTrueComplete: !p.declareTrueComplete,
                    })),
                  true
                )}
                {renderCheckbox(
                  "I understand false information may result in termination",
                  formData.declareFalseInfoConsequences,
                  () =>
                    setFormData((p) => ({
                      ...p,
                      declareFalseInfoConsequences: !p.declareFalseInfoConsequences,
                    })),
                  true
                )}
                {renderInput(
                  "Electronic Signature (Full Legal Name)",
                  formData.electronicSignatureFullLegalName,
                  (v) => setFormData((p) => ({ ...p, electronicSignatureFullLegalName: v })),
                  { required: true, placeholder: "Type your full legal name" }
                )}
                {renderInput(
                  "Date",
                  formData.dateLocal,
                  (v) => setFormData((p) => ({ ...p, dateLocal: v })),
                  { required: true, placeholder: "YYYY-MM-DD" }
                )}
              </>
            ) : null}
          </View>
        ) : null}
      </Card>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={[styles.pageDescription, { color: theme.textSecondary }]}>
          Please complete all required sections marked with *. Your information will be reviewed by
          our team.
        </ThemedText>

        {SECTIONS.map(renderSection)}

        <Button
          title={isSubmitting ? "Submitting..." : "Submit Application"}
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={styles.submitButton}
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  pageDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  sectionCard: {
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  sectionContent: {
    padding: Spacing.md,
    paddingTop: 0,
  },
  subsectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  submitButton: {
    marginTop: Spacing.lg,
  },
  addressPreview: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  addressPreviewLabel: {
    fontSize: 13,
    lineHeight: 20,
  },
});
