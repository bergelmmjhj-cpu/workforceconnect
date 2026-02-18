import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Linking,
  Modal,
  Pressable,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { LocationCoordinates } from "@/types";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import {
  calculateDistance,
  formatDistance,
  isWithinRadius,
  getCurrentLocation,
  requestLocationPermission,
  checkLocationPermission,
} from "@/utils/location";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const isNative = Platform.OS === "ios" || Platform.OS === "android";
let MapView: any = null;
let Circle: any = null;
let Marker: any = null;
if (isNative) {
  try {
    const Maps = require("react-native-maps");
    MapView = Maps.default;
    Circle = Maps.Circle;
    Marker = Maps.Marker;
  } catch {}
}

type ClockInOutRouteProp = RouteProp<RootStackParamList, "ClockInOut">;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BIG_BUTTON_SIZE = 120;

interface ShiftData {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string | null;
  status: string;
  workplaceId: string;
  workplaceName: string | null;
  workerUserId: string | null;
  roleType?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  geofenceRadiusMeters?: number;
}

interface TitoLogData {
  id: string;
  timeIn: string;
  timeOut: string | null;
  timeInGpsVerified: boolean;
  timeOutGpsVerified: boolean | null;
  status: string;
  timeInDistanceMeters: number | null;
  timeOutDistanceMeters: number | null;
}

export default function ClockInOutScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<ClockInOutRouteProp>();
  const { theme } = useTheme();
  const { user } = useAuth();
  const mapRef = useRef<any>(null);

  const [shift, setShift] = useState<ShiftData | null>(null);
  const [titoLog, setTitoLog] = useState<TitoLogData | null>(null);
  const [userLocation, setUserLocation] = useState<LocationCoordinates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [showClockOutConfirm, setShowClockOutConfirm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showLateReasonModal, setShowLateReasonModal] = useState(false);
  const [lateReasonTitoId, setLateReasonTitoId] = useState<string | null>(null);
  const [selectedLateReason, setSelectedLateReason] = useState<string | null>(null);
  const [lateNote, setLateNote] = useState("");
  const [isSubmittingLateReason, setIsSubmittingLateReason] = useState(false);

  useEffect(() => {
    loadData();
    checkPermission();
  }, []);

  useEffect(() => {
    if (userLocation && shift?.latitude && shift?.longitude) {
      const dist = calculateDistance(userLocation, {
        latitude: shift.latitude,
        longitude: shift.longitude,
      });
      setDistance(dist);
    }
  }, [userLocation, shift]);

  const checkPermission = async () => {
    const granted = await checkLocationPermission();
    setLocationPermission(granted);
    if (granted) {
      refreshLocation();
    }
  };

  const loadData = async () => {
    try {
      const shiftId = route.params?.shiftId;
      if (!shiftId) {
        setIsLoading(false);
        return;
      }

      const baseUrl = getApiUrl();
      const shiftRes = await fetch(new URL(`/api/shifts?shiftId=${shiftId}`, baseUrl).toString(), {
        headers: {
          "x-user-id": user?.id || "",
          "x-user-role": user?.role || "",
        },
      });
      const shiftsData = await shiftRes.json();
      let shiftItem = Array.isArray(shiftsData)
        ? shiftsData.find((s: any) => s.id === shiftId)
        : null;

      if (!shiftItem && shiftsData?.id) {
        shiftItem = shiftsData;
      }

      if (shiftItem?.workplaceId) {
        try {
          const wpRes = await fetch(new URL(`/api/workplaces/${shiftItem.workplaceId}`, baseUrl).toString(), {
            headers: {
              "x-user-id": user?.id || "",
              "x-user-role": user?.role || "",
            },
          });
          if (wpRes.ok) {
            const wp = await wpRes.json();
            shiftItem.latitude = wp.latitude;
            shiftItem.longitude = wp.longitude;
            shiftItem.geofenceRadiusMeters = wp.geofenceRadiusMeters || 150;
            if (!shiftItem.workplaceName) shiftItem.workplaceName = wp.name;
          }
        } catch {}
      }

      setShift(shiftItem || null);

      if (shiftItem && user) {
        try {
          const titoRes = await fetch(new URL("/api/tito/my-logs", baseUrl).toString(), {
            headers: {
              "x-user-id": user.id,
              "x-user-role": user.role,
            },
          });
          if (titoRes.ok) {
            const logs = await titoRes.json();
            const existingLog = Array.isArray(logs)
              ? logs.find((l: any) => l.shiftId === shiftItem.id && !l.timeOut)
              : null;
            if (existingLog) {
              setTitoLog(existingLog);
            } else {
              const completedLog = Array.isArray(logs)
                ? logs.find((l: any) => l.shiftId === shiftItem.id && l.timeOut)
                : null;
              if (completedLog) setTitoLog(completedLog);
            }
          }
        } catch {}
      }
    } catch (error) {
      console.error("Failed to load shift:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshLocation = async () => {
    const location = await getCurrentLocation();
    if (location) {
      setUserLocation(location);
    }
  };

  const handleRequestPermission = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const granted = await requestLocationPermission();
    setLocationPermission(granted);
    if (granted) {
      refreshLocation();
    }
  };

  const isWithinClockInWindow = useMemo(() => {
    if (!shift?.startTime || !shift?.date) return false;
    const now = new Date();
    const [hours, minutes] = shift.startTime.split(":").map(Number);
    const shiftStart = new Date(shift.date + "T00:00:00");
    shiftStart.setHours(hours, minutes, 0, 0);
    const diffMinutes = (shiftStart.getTime() - now.getTime()) / (1000 * 60);
    return diffMinutes <= 15;
  }, [shift?.startTime, shift?.date]);

  const clockInTimeMessage = useMemo(() => {
    if (!shift?.startTime || !shift?.date) return "";
    const now = new Date();
    const [hours, minutes] = shift.startTime.split(":").map(Number);
    const shiftStart = new Date(shift.date + "T00:00:00");
    shiftStart.setHours(hours, minutes, 0, 0);
    const diffMinutes = Math.ceil((shiftStart.getTime() - now.getTime()) / (1000 * 60));
    if (diffMinutes > 15) {
      const hrs = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} min`;
      return `Clock-in opens in ${timeStr}`;
    }
    return "";
  }, [shift?.startTime, shift?.date]);

  const isLateForShift = useMemo(() => {
    if (!shift?.startTime || !shift?.date) return false;
    const now = new Date();
    const [hours, minutes] = shift.startTime.split(":").map(Number);
    const shiftStart = new Date(shift.date + "T00:00:00");
    shiftStart.setHours(hours, minutes, 0, 0);
    const diffMinutes = (now.getTime() - shiftStart.getTime()) / (1000 * 60);
    return diffMinutes > 10;
  }, [shift?.startTime, shift?.date]);

  const isWithinGeofence =
    distance !== null && shift?.geofenceRadiusMeters
      ? distance <= shift.geofenceRadiusMeters
      : false;

  const canClockIn =
    !titoLog && isWithinGeofence && isWithinClockInWindow && shift?.latitude != null;
  const hasCompletedShift = titoLog?.timeOut;
  const canClockOut = titoLog && !titoLog.timeOut;

  const clockInBlockReason = useMemo(() => {
    if (titoLog || hasCompletedShift) return null;
    if (!shift?.latitude || !shift?.longitude) return "Workplace GPS not configured. Contact admin.";
    if (!userLocation) return "Getting your location...";
    if (!isWithinClockInWindow && clockInTimeMessage) return clockInTimeMessage;
    if (!isWithinClockInWindow) return "Outside clock-in window";
    if (!isWithinGeofence && distance !== null) {
      return `You are ${formatDistance(distance)} away. Move closer to work site.`;
    }
    if (!isWithinGeofence) return "Checking distance to work site...";
    return null;
  }, [titoLog, hasCompletedShift, shift, userLocation, isWithinClockInWindow, clockInTimeMessage, isWithinGeofence, distance]);

  const handleClockIn = async () => {
    if (!shift || !userLocation || !user) return;
    setErrorMessage(null);
    setIsClockingIn(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const res = await apiRequest("POST", "/api/tito/time-in", {
        workplaceId: shift.workplaceId,
        shiftId: shift.id,
        gpsLat: userLocation.latitude,
        gpsLng: userLocation.longitude,
      });
      const data = await res.json();
      if (data.success) {
        setTitoLog({
          id: data.titoLogId,
          timeIn: data.timeIn || new Date().toISOString(),
          timeOut: null,
          timeInGpsVerified: data.gpsVerified,
          timeOutGpsVerified: null,
          status: "pending",
          timeInDistanceMeters: data.distance,
          timeOutDistanceMeters: null,
        });
        if (isLateForShift) {
          setLateReasonTitoId(data.titoLogId);
          setShowLateReasonModal(true);
        }
      } else {
        setErrorMessage(data.error || "Failed to clock in");
      }
    } catch (error: any) {
      const msg = error?.data?.error || error?.message || "Failed to clock in";
      setErrorMessage(msg);
    } finally {
      setIsClockingIn(false);
    }
  };

  const handleClockOutPress = () => {
    if (!shift || !titoLog) return;
    if (!userLocation) {
      refreshLocation();
      setShowClockOutConfirm(true);
      return;
    }
    if (!isWithinGeofence) {
      setShowClockOutConfirm(true);
    } else {
      executeClockOut();
    }
  };

  const executeClockOut = async () => {
    if (!shift || !titoLog) return;
    setShowClockOutConfirm(false);
    setErrorMessage(null);
    setIsClockingOut(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const res = await apiRequest("POST", "/api/tito/time-out", {
        titoLogId: titoLog.id,
        gpsLat: userLocation?.latitude || 0,
        gpsLng: userLocation?.longitude || 0,
      });
      const data = await res.json();
      if (data.success) {
        setTitoLog({
          ...titoLog,
          timeOut: data.timeOut || new Date().toISOString(),
          timeOutGpsVerified: data.gpsVerified,
          timeOutDistanceMeters: data.distance,
          status: data.flaggedForReview ? "flagged" : titoLog.status,
        });
      }
    } catch (error: any) {
      const msg = error?.data?.error || error?.message || "Failed to clock out";
      setErrorMessage(msg);
    } finally {
      setIsClockingOut(false);
    }
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setShowDetailModal(true);
  };

  const handleSubmitLateReason = async () => {
    if (!lateReasonTitoId || !selectedLateReason) return;
    setIsSubmittingLateReason(true);
    try {
      await apiRequest("POST", `/api/tito/${lateReasonTitoId}/late-reason`, {
        lateReason: selectedLateReason,
        lateNote: lateNote.trim() || undefined,
      });
    } catch (err) {
      console.error("Failed to submit late reason:", err);
    } finally {
      setIsSubmittingLateReason(false);
      setShowLateReasonModal(false);
      setSelectedLateReason(null);
      setLateNote("");
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!shift) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: theme.backgroundRoot }]}>
        <Feather name="alert-circle" size={48} color={theme.textMuted} />
        <ThemedText style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
          Shift not found
        </ThemedText>
      </View>
    );
  }

  const workplaceCoords =
    shift.latitude != null && shift.longitude != null
      ? { latitude: shift.latitude, longitude: shift.longitude }
      : null;

  const geofenceRadius = shift.geofenceRadiusMeters || 150;

  const mapRegion = workplaceCoords
    ? {
        latitude: workplaceCoords.latitude,
        longitude: workplaceCoords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }
    : userLocation
    ? {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }
    : null;

  const buttonColor = hasCompletedShift
    ? theme.success
    : canClockOut
    ? "#EF4444"
    : canClockIn
    ? "#10B981"
    : "#94A3B8";

  const buttonLabel = hasCompletedShift
    ? "Completed"
    : canClockOut
    ? "Clock Out"
    : canClockIn
    ? "Clock In"
    : "Clock In";

  const buttonIcon = hasCompletedShift
    ? "check-circle"
    : canClockOut
    ? "log-out"
    : "log-in";

  const isButtonDisabled =
    hasCompletedShift ||
    isClockingIn ||
    isClockingOut ||
    (!titoLog && !canClockIn);

  const handleBigButtonPress = () => {
    if (hasCompletedShift) return;
    if (canClockOut) {
      handleClockOutPress();
    } else if (canClockIn) {
      handleClockIn();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {locationPermission === false ? (
        <View style={[styles.fullScreen, { backgroundColor: theme.backgroundRoot }]}>
          <View style={[styles.permIcon, { backgroundColor: theme.warning + "20" }]}>
            <Feather name="map-pin" size={40} color={theme.warning} />
          </View>
          <ThemedText style={styles.permTitle}>Location Access Required</ThemedText>
          <ThemedText style={[styles.permText, { color: theme.textSecondary }]}>
            We need your location to verify you are at the work site.
          </ThemedText>
          <Pressable
            onPress={handleRequestPermission}
            style={[styles.permButton, { backgroundColor: theme.primary }]}
          >
            <ThemedText style={{ color: "#fff", fontWeight: "600" }}>Enable Location</ThemedText>
          </Pressable>
          {Platform.OS !== "web" ? (
            <Pressable
              onPress={() => {
                try { Linking.openSettings(); } catch {}
              }}
              style={[styles.permButton, { backgroundColor: theme.backgroundSecondary, marginTop: Spacing.sm }]}
            >
              <ThemedText style={{ fontWeight: "600" }}>Open Settings</ThemedText>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <>
          <View style={styles.mapContainer}>
            {isNative && MapView && mapRegion ? (
              <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFillObject}
                initialRegion={mapRegion}
                showsUserLocation
                showsMyLocationButton={false}
                showsCompass={false}
              >
                {workplaceCoords ? (
                  <>
                    <Circle
                      center={workplaceCoords}
                      radius={geofenceRadius}
                      fillColor="rgba(91, 155, 213, 0.15)"
                      strokeColor="rgba(91, 155, 213, 0.4)"
                      strokeWidth={2}
                    />
                    <Marker
                      coordinate={workplaceCoords}
                      title={shift.workplaceName || "Work Site"}
                    />
                  </>
                ) : null}
              </MapView>
            ) : (
              <View style={[styles.webMapFallback, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="map" size={64} color={theme.textMuted} />
                <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: "center" }}>
                  {Platform.OS === "web"
                    ? "Open in Expo Go for live map"
                    : workplaceCoords
                    ? "Loading map..."
                    : "No workplace coordinates configured"}
                </ThemedText>
                {distance !== null ? (
                  <View style={[styles.distanceBadgeAlt, { backgroundColor: isWithinGeofence ? theme.success + "20" : theme.error + "20" }]}>
                    <Feather name="navigation" size={14} color={isWithinGeofence ? theme.success : theme.error} />
                    <ThemedText style={{ color: isWithinGeofence ? theme.success : theme.error, fontWeight: "600", fontSize: 14 }}>
                      {formatDistance(distance)} away
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            )}

            {isNative && distance !== null ? (
              <View style={[styles.distanceBadge, { backgroundColor: isWithinGeofence ? "#10b981" : "#ef4444" }]}>
                <Feather name="navigation" size={12} color="#fff" />
                <ThemedText style={styles.distanceBadgeText}>
                  {formatDistance(distance)}
                </ThemedText>
              </View>
            ) : null}

            <Pressable
              onPress={() => refreshLocation()}
              style={[styles.refreshBtn, { backgroundColor: theme.backgroundRoot }]}
            >
              <Feather name="crosshair" size={20} color={theme.text} />
            </Pressable>
          </View>

          <View style={[styles.bottomPanel, { backgroundColor: theme.backgroundRoot, paddingBottom: insets.bottom + Spacing.md }]}>
            <View style={styles.shiftInfoRow}>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.shiftTitle} numberOfLines={1}>
                  {shift.title || shift.roleType || "Shift"}
                </ThemedText>
                <ThemedText style={[styles.shiftSub, { color: theme.textSecondary }]} numberOfLines={1}>
                  {shift.workplaceName || "Unknown Location"} · {shift.startTime}{shift.endTime ? ` - ${shift.endTime}` : ""}
                </ThemedText>
              </View>
              {distance !== null && !isNative ? null : null}
            </View>

            {errorMessage ? (
              <View style={[styles.errorBanner, { backgroundColor: "#ef444415" }]}>
                <Feather name="alert-circle" size={14} color="#ef4444" />
                <ThemedText style={{ color: "#ef4444", fontSize: 13, flex: 1 }}>{errorMessage}</ThemedText>
              </View>
            ) : null}

            {clockInBlockReason ? (
              <View style={[styles.infoBanner, { backgroundColor: "#F59E0B15" }]}>
                <Feather name="info" size={14} color="#F59E0B" />
                <ThemedText style={{ color: "#F59E0B", fontSize: 13, flex: 1, fontWeight: "500" }}>{clockInBlockReason}</ThemedText>
              </View>
            ) : null}

            {canClockIn && !titoLog ? (
              <View style={[styles.infoBanner, { backgroundColor: "#10B98115" }]}>
                <Feather name="check-circle" size={14} color="#10B981" />
                <ThemedText style={{ color: "#10B981", fontSize: 13, flex: 1, fontWeight: "500" }}>Ready to clock in</ThemedText>
              </View>
            ) : null}

            {titoLog && !titoLog.timeOut && !isWithinGeofence && distance !== null ? (
              <View style={[styles.infoBanner, { backgroundColor: theme.warning + "15" }]}>
                <Feather name="alert-triangle" size={14} color={theme.warning} />
                <ThemedText style={{ color: theme.warning, fontSize: 13, flex: 1 }}>
                  Outside geofence. Clock-out will be flagged for review.
                </ThemedText>
              </View>
            ) : null}

            {hasCompletedShift && titoLog ? (
              <View style={[styles.completedRow, { backgroundColor: theme.success + "12" }]}>
                <View style={styles.completedTimeItem}>
                  <Feather name="log-in" size={14} color={theme.success} />
                  <ThemedText style={{ fontSize: 13, color: theme.success }}>
                    In: {new Date(titoLog.timeIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </ThemedText>
                </View>
                <View style={styles.completedTimeItem}>
                  <Feather name="log-out" size={14} color={theme.success} />
                  <ThemedText style={{ fontSize: 13, color: theme.success }}>
                    Out: {titoLog.timeOut ? new Date(titoLog.timeOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}
                  </ThemedText>
                </View>
              </View>
            ) : null}

            {titoLog && !titoLog.timeOut ? (
              <View style={[styles.clockedInBanner, { backgroundColor: theme.success + "12" }]}>
                <Feather name="check-circle" size={14} color={theme.success} />
                <ThemedText style={{ fontSize: 13, color: theme.success, fontWeight: "500" }}>
                  Clocked in at {new Date(titoLog.timeIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </ThemedText>
              </View>
            ) : null}

            <View style={styles.bigButtonRow}>
              <Pressable
                onPress={() => navigation.navigate("MainTabs", { screen: "Shifts" })}
                style={[styles.quickButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <Feather name="check-square" size={22} color={theme.primary} />
                <ThemedText style={[styles.quickLabel, { color: theme.text }]}>My requests</ThemedText>
              </Pressable>

              <Pressable
                onPress={handleBigButtonPress}
                onLongPress={handleLongPress}
                disabled={!!(isButtonDisabled && !hasCompletedShift)}
                style={({ pressed }) => [
                  styles.bigButton,
                  {
                    backgroundColor: buttonColor,
                    opacity: isButtonDisabled && !hasCompletedShift ? 0.5 : pressed ? 0.85 : 1,
                    transform: [{ scale: pressed && !isButtonDisabled ? 0.95 : 1 }],
                  },
                ]}
                testID="button-clock-action"
              >
                {isClockingIn || isClockingOut ? (
                  <ActivityIndicator size="large" color="#fff" />
                ) : (
                  <>
                    <Feather name={buttonIcon as any} size={32} color="#fff" />
                    <ThemedText style={styles.bigButtonLabel}>{buttonLabel}</ThemedText>
                  </>
                )}
              </Pressable>

              <Pressable
                onPress={() => navigation.navigate("MainTabs", { screen: "Time" })}
                style={[styles.quickButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <Feather name="clock" size={22} color={theme.primary} />
                <ThemedText style={[styles.quickLabel, { color: theme.text }]}>My timesheet</ThemedText>
              </Pressable>
            </View>
          </View>
        </>
      )}

      <Modal
        visible={showClockOutConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClockOutConfirm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}>
            <View style={[styles.modalIcon, { backgroundColor: theme.warning + "20" }]}>
              <Feather name="alert-triangle" size={32} color={theme.warning} />
            </View>
            <ThemedText style={styles.modalTitle}>Outside Work Site</ThemedText>
            <ThemedText style={[styles.modalMsg, { color: theme.textSecondary }]}>
              You are {distance ? formatDistance(distance) : "far"} from the work site.
              Your clock-out will be flagged for admin review.
            </ThemedText>
            <View style={styles.modalBtns}>
              <Pressable
                onPress={() => setShowClockOutConfirm(false)}
                style={[styles.modalBtn, { backgroundColor: theme.backgroundSecondary }]}
              >
                <ThemedText style={{ fontWeight: "600" }}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={executeClockOut}
                style={[styles.modalBtn, { backgroundColor: theme.warning }]}
              >
                <ThemedText style={{ fontWeight: "600", color: "#fff" }}>Clock Out Anyway</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowDetailModal(false)}>
          <View style={[styles.detailModal, { backgroundColor: theme.backgroundRoot }]}>
            <View style={styles.detailHandle} />
            <ThemedText style={styles.detailTitle}>{shift.title || shift.roleType || "Shift Details"}</ThemedText>
            <View style={styles.detailRow}>
              <Feather name="map-pin" size={16} color={theme.textSecondary} />
              <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                {shift.workplaceName || "Unknown Location"}
              </ThemedText>
            </View>
            <View style={styles.detailRow}>
              <Feather name="calendar" size={16} color={theme.textSecondary} />
              <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                {shift.date}
              </ThemedText>
            </View>
            <View style={styles.detailRow}>
              <Feather name="clock" size={16} color={theme.textSecondary} />
              <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                {shift.startTime}{shift.endTime ? ` - ${shift.endTime}` : ""}
              </ThemedText>
            </View>
            <View style={styles.detailRow}>
              <Feather name="target" size={16} color={theme.textSecondary} />
              <ThemedText style={[styles.detailText, { color: theme.textSecondary }]}>
                {geofenceRadius}m geofence radius
              </ThemedText>
            </View>
            {distance !== null ? (
              <View style={styles.detailRow}>
                <Feather name="navigation" size={16} color={isWithinGeofence ? theme.success : theme.error} />
                <ThemedText style={{ color: isWithinGeofence ? theme.success : theme.error, fontSize: 14 }}>
                  {formatDistance(distance)} from work site {isWithinGeofence ? "(within range)" : "(outside range)"}
                </ThemedText>
              </View>
            ) : null}
            {titoLog ? (
              <View style={[styles.detailRow, { marginTop: Spacing.sm }]}>
                <Feather name="log-in" size={16} color={theme.success} />
                <ThemedText style={{ fontSize: 14, color: theme.textSecondary }}>
                  Clocked in: {new Date(titoLog.timeIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {titoLog.timeOut ? ` | Out: ${new Date(titoLog.timeOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                </ThemedText>
              </View>
            ) : null}
            <Pressable
              onPress={() => setShowDetailModal(false)}
              style={[styles.detailCloseBtn, { backgroundColor: theme.primary }]}
            >
              <ThemedText style={{ color: "#fff", fontWeight: "600" }}>Close</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={showLateReasonModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowLateReasonModal(false);
          setSelectedLateReason(null);
          setLateNote("");
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {}}
        >
          <Pressable
            style={[styles.lateReasonModal, { backgroundColor: theme.backgroundDefault }]}
            onPress={() => {}}
          >
            <View style={styles.lateReasonHeader}>
              <Feather name="alert-triangle" size={24} color="#F59E0B" />
              <ThemedText type="h4" style={{ marginLeft: 8 }}>Late Clock-In</ThemedText>
            </View>
            <ThemedText style={{ color: theme.textSecondary, fontSize: 14, marginBottom: Spacing.lg }}>
              You are clocking in late. Please select a reason:
            </ThemedText>
            {["Traffic", "Transportation", "Personal Emergency", "Other"].map((reason) => (
              <Pressable
                key={reason}
                onPress={() => setSelectedLateReason(reason)}
                style={[
                  styles.lateReasonOption,
                  {
                    backgroundColor: selectedLateReason === reason ? theme.primary + "20" : theme.backgroundSecondary,
                    borderColor: selectedLateReason === reason ? theme.primary : theme.border,
                  },
                ]}
              >
                <View style={styles.lateReasonRadio}>
                  {selectedLateReason === reason ? (
                    <View style={[styles.lateReasonRadioFilled, { backgroundColor: theme.primary }]} />
                  ) : null}
                </View>
                <ThemedText style={{ fontSize: 14 }}>{reason}</ThemedText>
              </Pressable>
            ))}
            <View style={{ marginTop: Spacing.md }}>
              <ThemedText style={{ color: theme.textMuted, fontSize: 12, marginBottom: 4 }}>Note (optional)</ThemedText>
              <View style={[styles.lateNoteInput, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}>
                <ThemedText
                  style={{ color: lateNote ? theme.text : theme.textMuted, fontSize: 14 }}
                  numberOfLines={2}
                >
                  {lateNote || "Tap to add a note..."}
                </ThemedText>
              </View>
            </View>
            <View style={styles.lateReasonButtons}>
              <Pressable
                onPress={() => {
                  setShowLateReasonModal(false);
                  setSelectedLateReason(null);
                  setLateNote("");
                }}
                style={[styles.lateReasonBtn, { backgroundColor: theme.backgroundSecondary }]}
              >
                <ThemedText style={{ color: theme.text, fontWeight: "600" }}>Skip</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSubmitLateReason}
                disabled={!selectedLateReason || isSubmittingLateReason}
                style={[
                  styles.lateReasonBtn,
                  {
                    backgroundColor: selectedLateReason ? theme.primary : theme.textMuted,
                    opacity: isSubmittingLateReason ? 0.6 : 1,
                  },
                ]}
              >
                {isSubmittingLateReason ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>Submit</ThemedText>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  mapContainer: {
    flex: 1,
  },
  webMapFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  distanceBadge: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  distanceBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  distanceBadgeAlt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: Spacing.md,
  },
  refreshBtn: {
    position: "absolute",
    top: 60,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomPanel: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
  },
  shiftInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  shiftTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  shiftSub: {
    fontSize: 13,
    marginTop: 2,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  completedRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  completedTimeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  clockedInBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  bigButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: Spacing.md,
  },
  quickButton: {
    width: 80,
    height: 80,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
  bigButton: {
    width: BIG_BUTTON_SIZE,
    height: BIG_BUTTON_SIZE,
    borderRadius: BIG_BUTTON_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  bigButtonLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  permIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  permTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  permText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  permButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  modalContent: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    gap: Spacing.md,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalMsg: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  modalBtns: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
    width: "100%",
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  detailModal: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: Spacing.xl,
    paddingTop: Spacing.md,
  },
  detailHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#ccc",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: Spacing.lg,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  detailText: {
    fontSize: 14,
  },
  detailCloseBtn: {
    marginTop: Spacing.lg,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    width: "100%",
  },
  lateReasonModal: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: "90%",
    maxWidth: 380,
  },
  lateReasonHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  lateReasonOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: 10,
  },
  lateReasonRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#94A3B8",
    justifyContent: "center",
    alignItems: "center",
  },
  lateReasonRadioFilled: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  lateNoteInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 40,
  },
  lateReasonButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  lateReasonBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
});
