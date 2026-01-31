import React, { useState, useCallback, useRef } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, Typography } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

export interface AddressData {
  formattedAddress: string;
  addressLine1: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
}

interface AddressAutocompleteProps {
  label?: string;
  value: string;
  onAddressSelect: (address: AddressData) => void;
  onClear?: () => void;
  error?: string;
  containerStyle?: ViewStyle;
  placeholder?: string;
  userRole: string;
  userId: string;
  isAddressSelected?: boolean;
}

export function AddressAutocomplete({
  label,
  value,
  onAddressSelect,
  onClear,
  error,
  containerStyle,
  placeholder = "Search address...",
  userRole,
  userId,
  isAddressSelected = false,
}: AddressAutocompleteProps) {
  const { theme } = useTheme();
  const [inputValue, setInputValue] = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      setApiError(null);
      return;
    }

    setIsLoading(true);
    setApiError(null);
    try {
      const url = new URL("/api/places/autocomplete", getApiUrl());
      url.searchParams.set("input", input);

      const response = await fetch(url.toString(), {
        headers: {
          "x-user-role": userRole,
          "x-user-id": userId,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPredictions(data.predictions || []);
        setShowDropdown(data.predictions?.length > 0);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setApiError(errorData.message || "Address search unavailable. Please try again later.");
        setShowDropdown(false);
      }
    } catch (err) {
      console.error("Error fetching predictions:", err);
      setApiError("Address search unavailable. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }, [userRole, userId]);

  const handleInputChange = (text: string) => {
    setInputValue(text);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchPredictions(text);
    }, 300);
  };

  const handleSelectPrediction = async (prediction: Prediction) => {
    setIsLoading(true);
    setShowDropdown(false);
    
    try {
      const url = new URL(`/api/places/details/${prediction.place_id}`, getApiUrl());
      const response = await fetch(url.toString(), {
        headers: {
          "x-user-role": userRole,
          "x-user-id": userId,
        },
      });

      if (response.ok) {
        const addressData: AddressData = await response.json();
        setInputValue(addressData.formattedAddress);
        onAddressSelect(addressData);
        setPredictions([]);
      }
    } catch (err) {
      console.error("Error fetching address details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setInputValue("");
    setPredictions([]);
    setShowDropdown(false);
    onClear?.();
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <ThemedText style={[styles.label, { color: theme.textSecondary }]}>
          {label}
        </ThemedText>
      ) : null}
      
      <View style={styles.inputWrapper}>
        <View style={[
          styles.inputContainer,
          {
            backgroundColor: theme.backgroundDefault,
            borderColor: error ? theme.error : isAddressSelected ? theme.success : theme.border,
            borderWidth: isAddressSelected ? 2 : 1,
          },
        ]}>
          <Feather 
            name="search" 
            size={18} 
            color={theme.textMuted} 
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            value={inputValue}
            onChangeText={handleInputChange}
            placeholder={placeholder}
            placeholderTextColor={theme.textMuted}
            onFocus={() => {
              if (predictions.length > 0) {
                setShowDropdown(true);
              }
            }}
          />
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.primary} style={styles.clearButton} />
          ) : inputValue.length > 0 ? (
            <Pressable onPress={handleClear} style={styles.clearButton}>
              <Feather name="x" size={18} color={theme.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {showDropdown && predictions.length > 0 ? (
          <View style={[
            styles.dropdown,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
            },
          ]}>
            <ScrollView 
              style={styles.dropdownScroll}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {predictions.map((prediction) => (
                <Pressable
                  key={prediction.place_id}
                  style={({ pressed }) => [
                    styles.predictionItem,
                    { 
                      backgroundColor: pressed ? theme.backgroundElevated : theme.backgroundDefault,
                    },
                  ]}
                  onPress={() => handleSelectPrediction(prediction)}
                >
                  <Feather 
                    name="map-pin" 
                    size={16} 
                    color={theme.textSecondary} 
                    style={styles.predictionIcon}
                  />
                  <View style={styles.predictionTextContainer}>
                    <ThemedText style={styles.predictionMain} numberOfLines={1}>
                      {prediction.structured_formatting?.main_text || prediction.description.split(",")[0]}
                    </ThemedText>
                    <ThemedText style={[styles.predictionSecondary, { color: theme.textSecondary }]} numberOfLines={1}>
                      {prediction.structured_formatting?.secondary_text || prediction.description}
                    </ThemedText>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </View>

      {apiError ? (
        <View style={styles.apiErrorContainer}>
          <Feather name="alert-circle" size={14} color={theme.warning} />
          <ThemedText style={[styles.apiErrorText, { color: theme.warning }]}>
            {apiError}
          </ThemedText>
        </View>
      ) : null}

      {isAddressSelected ? (
        <View style={styles.selectedIndicator}>
          <Feather name="check-circle" size={14} color={theme.success} />
          <ThemedText style={[styles.selectedText, { color: theme.success }]}>
            Address selected with GPS coordinates
          </ThemedText>
        </View>
      ) : null}

      {error ? (
        <ThemedText style={[styles.error, { color: theme.error }]}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
    zIndex: 1000,
  },
  label: {
    ...Typography.label,
    marginBottom: Spacing.xs,
  },
  inputWrapper: {
    position: "relative",
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: Spacing.inputHeight,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    ...Typography.body,
    height: "100%",
  },
  clearButton: {
    padding: Spacing.xs,
  },
  dropdown: {
    position: "absolute",
    top: Spacing.inputHeight + 4,
    left: 0,
    right: 0,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    maxHeight: 200,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 1001,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  predictionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  predictionIcon: {
    marginRight: Spacing.sm,
  },
  predictionTextContainer: {
    flex: 1,
  },
  predictionMain: {
    ...Typography.body,
    fontWeight: "500",
  },
  predictionSecondary: {
    ...Typography.caption,
    marginTop: 2,
  },
  apiErrorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: "rgba(255, 193, 7, 0.1)",
    borderRadius: BorderRadius.sm,
  },
  apiErrorText: {
    ...Typography.caption,
    marginLeft: Spacing.xs,
    flex: 1,
  },
  selectedIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  selectedText: {
    ...Typography.caption,
    marginLeft: Spacing.xs,
  },
  error: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
});
