import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Linking,
  ScrollView,
  Modal,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { StatusPill } from "@/components/StatusPill";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { Shift, TitoLog, LocationCoordinates } from "@/types";
import { getShift, getTitoLogs, createTitoLog, updateTitoLog } from "@/storage";
import {
  calculateDistance,
  formatDistance,
  isWithinRadius,
  getCurrentLocation,
  requestLocationPermission,
  checkLocationPermission,
} from "@/utils/location";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type ClockInOutRouteProp = RouteProp<RootStackParamList, "ClockInOut">;

export default function ClockInOutScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation();
  const route = useRoute<ClockInOutRouteProp>();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [shift, setShift] = useState<Shift | null>(null);
  const [titoLog, setTitoLog] = useState<TitoLog | null>(null);
  const [userLocation, setUserLocation] = useState<LocationCoordinates | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClockingIn, setIsClockingIn] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showClockOutConfirm, setShowClockOutConfirm] = useState(false);

  const isWeb = Platform.OS === "web";

  useEffect(() => {
    loadData();
    checkPermission();
  }, []);

  useEffect(() => {
    if (userLocation && shift?.locationCoordinates) {
      const dist = calculateDistance(userLocation, shift.locationCoordinates);
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
      
      const shiftData = await getShift(shiftId);
      setShift(shiftData);

      if (shiftData && user) {
        const logs = await getTitoLogs(user.id, user.role);
        const existingLog = logs.find(
          (l) => l.shiftId === shiftData.id && !l.timeOut
        );
        setTitoLog(existingLog || null);
      }
    } catch (error) {
      console.error("Failed to load shift:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshLocation = async () => {
    setIsRefreshing(true);
    const location = await getCurrentLocation();
    if (location) {
      setUserLocation(location);
    }
    setIsRefreshing(false);
  };

  const handleRequestPermission = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const granted = await requestLocationPermission();
    setLocationPermission(granted);
    if (granted) {
      refreshLocation();
    }
  };

  const handleOpenSettings = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS !== "web") {
      try {
        await Linking.openSettings();
      } catch (error) {
        console.error("Cannot open settings:", error);
      }
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
      return `Clock-in opens ${diffMinutes} min before shift (${shift.startTime})`;
    }
    return "";
  }, [shift?.startTime, shift?.date]);

  const handleClockIn = async () => {
    if (!shift || !userLocation || !user || !shift.locationCoordinates) return;

    const withinRadius = isWithinRadius(
      userLocation,
      shift.locationCoordinates,
      shift.geofenceRadius
    );

    if (!withinRadius) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!isWithinClockInWindow) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsClockingIn(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const newLog = await createTitoLog({
        shiftId: shift.id,
        workerId: user.id,
        workerName: user.fullName,
        timeIn: new Date().toISOString(),
        timeInLocation: shift.locationMajorIntersection,
        timeInCoordinates: userLocation,
        timeInDistance: distance || 0,
        verificationMethod: "gps",
        status: "pending",
        shiftDate: new Date().toISOString().split("T")[0],
      });
      setTitoLog(newLog);
    } catch (error) {
      console.error("Failed to clock in:", error);
    } finally {
      setIsClockingIn(false);
    }
  };

  const handleClockOutPress = () => {
    if (!shift || !userLocation || !titoLog) return;
    if (!isWithinGeofence) {
      setShowClockOutConfirm(true);
    } else {
      executeClockOut();
    }
  };

  const executeClockOut = async () => {
    if (!shift || !userLocation || !titoLog) return;

    setShowClockOutConfirm(false);
    setIsClockingOut(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const updated = await updateTitoLog(titoLog.id, {
        timeOut: new Date().toISOString(),
        timeOutLocation: shift.locationMajorIntersection,
        timeOutCoordinates: userLocation,
        timeOutDistance: distance || 0,
      });
      if (updated) {
        setTitoLog(updated);
      }
    } catch (error) {
      console.error("Failed to clock out:", error);
    } finally {
      setIsClockingOut(false);
    }
  };

  const isWithinGeofence =
    distance !== null && shift?.geofenceRadius
      ? distance <= shift.geofenceRadius
      : false;

  const canClockIn = !titoLog && isWithinGeofence && isWithinClockInWindow && shift?.locationCoordinates;
  const canClockOut =
    titoLog && !titoLog.timeOut && userLocation && shift?.locationCoordinates;
  const hasCompletedShift = titoLog?.timeOut;

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!shift) {
    return (
      <View
        style={[
          styles.errorContainer,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <ThemedText>Shift not found</ThemedText>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Platform.OS === "web" ? Spacing.lg : headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
    >
      <Card style={styles.shiftCard}>
        <View style={styles.shiftHeader}>
          <ThemedText style={styles.shiftRole}>{shift.roleNeeded}</ThemedText>
          <StatusPill status={shift.status} />
        </View>
        <View style={styles.shiftDetail}>
          <Feather name="map-pin" size={16} color={theme.textSecondary} />
          <ThemedText style={[styles.shiftText, { color: theme.textSecondary }]}>
            {shift.locationMajorIntersection}
          </ThemedText>
        </View>
        <View style={styles.shiftDetail}>
          <Feather name="briefcase" size={16} color={theme.textSecondary} />
          <ThemedText style={[styles.shiftText, { color: theme.textSecondary }]}>
            {shift.clientName}
          </ThemedText>
        </View>
        <View style={styles.shiftDetail}>
          <Feather name="target" size={16} color={theme.textSecondary} />
          <ThemedText style={[styles.shiftText, { color: theme.textSecondary }]}>
            {shift.geofenceRadius}m geofence radius
          </ThemedText>
        </View>
      </Card>

      {locationPermission === false ? (
        <Card style={styles.permissionCard}>
          <View style={styles.permissionContent}>
            <View
              style={[
                styles.permissionIcon,
                { backgroundColor: theme.warning + "20" },
              ]}
            >
              <Feather name="map-pin" size={32} color={theme.warning} />
            </View>
            <ThemedText style={styles.permissionTitle}>
              Location Access Required
            </ThemedText>
            <ThemedText
              style={[styles.permissionText, { color: theme.textSecondary }]}
            >
              To clock in or out, we need to verify you're at the work site.
              Please enable location access.
            </ThemedText>
            <Button onPress={handleRequestPermission} style={styles.permissionButton}>
              Enable Location
            </Button>
            {Platform.OS !== "web" && (
              <Button onPress={handleOpenSettings} style={styles.settingsButton}>
                Open Settings
              </Button>
            )}
          </View>
        </Card>
      ) : locationPermission === null ? (
        <Card style={styles.permissionCard}>
          <View style={styles.permissionContent}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText style={[styles.permissionText, { marginTop: Spacing.md }]}>
              Checking location permissions...
            </ThemedText>
          </View>
        </Card>
      ) : (
        <>
          <Card style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <View style={styles.locationIcon}>
                <Feather name="navigation" size={24} color={theme.primary} />
              </View>
              <View style={styles.locationInfo}>
                <ThemedText style={styles.locationTitle}>
                  {shift.locationMajorIntersection}
                </ThemedText>
                <ThemedText style={[styles.locationSubtitle, { color: theme.textSecondary }]}>
                  Work site location
                </ThemedText>
              </View>
            </View>
            
            {isWeb && (
              <View style={[styles.webNotice, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="smartphone" size={16} color={theme.textSecondary} />
                <ThemedText style={[styles.webNoticeText, { color: theme.textSecondary }]}>
                  Open in Expo Go for map view
                </ThemedText>
              </View>
            )}
          </Card>

          <Card style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <View
                  style={[
                    styles.statusIconContainer,
                    { backgroundColor: isWithinGeofence ? theme.success + "20" : theme.error + "20" },
                  ]}
                >
                  <Feather
                    name={isWithinGeofence ? "check-circle" : "x-circle"}
                    size={24}
                    color={isWithinGeofence ? theme.success : theme.error}
                  />
                </View>
                <View>
                  <ThemedText style={styles.statusLabel}>
                    {isWithinGeofence ? "Within Range" : "Outside Range"}
                  </ThemedText>
                  <ThemedText style={[styles.statusHint, { color: theme.textSecondary }]}>
                    {isWithinGeofence
                      ? "You can clock in/out"
                      : `Must be within ${shift.geofenceRadius}m`}
                  </ThemedText>
                </View>
              </View>
              {distance !== null && (
                <View style={styles.distanceContainer}>
                  <ThemedText
                    style={[
                      styles.distanceText,
                      { color: isWithinGeofence ? theme.success : theme.error },
                    ]}
                  >
                    {formatDistance(distance)}
                  </ThemedText>
                  <ThemedText style={[styles.distanceLabel, { color: theme.textSecondary }]}>
                    from site
                  </ThemedText>
                </View>
              )}
            </View>

            {!isWithinGeofence && distance !== null && (
              <View style={[styles.warningBanner, { backgroundColor: theme.error + "15" }]}>
                <Feather name="alert-triangle" size={16} color={theme.error} />
                <ThemedText style={[styles.warningText, { color: theme.error }]}>
                  {titoLog && !titoLog.timeOut
                    ? `You are outside the geofence. Clock-out will be flagged for admin review.`
                    : `Move ${formatDistance(Math.max(0, distance - shift.geofenceRadius))} closer to clock in`}
                </ThemedText>
              </View>
            )}

            {clockInTimeMessage ? (
              <View style={[styles.warningBanner, { backgroundColor: theme.warning + "15" }]}>
                <Feather name="clock" size={16} color={theme.warning} />
                <ThemedText style={[styles.warningText, { color: theme.warning }]}>
                  {clockInTimeMessage}
                </ThemedText>
              </View>
            ) : null}

            <Button
              onPress={refreshLocation}
              disabled={isRefreshing}
              style={[styles.refreshButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <View style={styles.refreshContent}>
                {isRefreshing ? (
                  <ActivityIndicator size="small" color={theme.text} />
                ) : (
                  <Feather name="refresh-cw" size={16} color={theme.text} />
                )}
                <ThemedText style={{ marginLeft: Spacing.sm }}>
                  {isRefreshing ? "Refreshing..." : "Refresh Location"}
                </ThemedText>
              </View>
            </Button>
          </Card>

          {hasCompletedShift ? (
            <Card style={styles.completedCard}>
              <Feather name="check-circle" size={48} color={theme.success} />
              <ThemedText style={styles.completedTitle}>Shift Completed</ThemedText>
              <ThemedText style={[styles.completedText, { color: theme.textSecondary }]}>
                You have clocked in and out for this shift.
              </ThemedText>
              {titoLog && (
                <View style={styles.completedTimes}>
                  <View style={styles.completedTimeRow}>
                    <Feather name="log-in" size={16} color={theme.success} />
                    <ThemedText style={{ color: theme.textSecondary }}>In: </ThemedText>
                    <ThemedText>
                      {new Date(titoLog.timeIn!).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </ThemedText>
                  </View>
                  <View style={styles.completedTimeRow}>
                    <Feather name="log-out" size={16} color={theme.error} />
                    <ThemedText style={{ color: theme.textSecondary }}>Out: </ThemedText>
                    <ThemedText>
                      {new Date(titoLog.timeOut!).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </ThemedText>
                  </View>
                </View>
              )}
            </Card>
          ) : (
            <View style={styles.actionButtons}>
              {!titoLog ? (
                <Button
                  onPress={handleClockIn}
                  disabled={!canClockIn || isClockingIn}
                  style={[
                    styles.clockButton,
                    { backgroundColor: canClockIn ? theme.success : theme.textMuted },
                  ]}
                >
                  {isClockingIn ? (
                    <ActivityIndicator color={theme.buttonText} />
                  ) : (
                    <View style={styles.clockButtonContent}>
                      <Feather name="log-in" size={20} color={theme.buttonText} />
                      <ThemedText style={[styles.clockButtonText, { color: theme.buttonText }]}>
                        Clock In
                      </ThemedText>
                    </View>
                  )}
                </Button>
              ) : (
                <Button
                  onPress={handleClockOutPress}
                  disabled={!canClockOut || isClockingOut}
                  style={[
                    styles.clockButton,
                    { backgroundColor: canClockOut ? theme.error : theme.textMuted },
                  ]}
                >
                  {isClockingOut ? (
                    <ActivityIndicator color={theme.buttonText} />
                  ) : (
                    <View style={styles.clockButtonContent}>
                      <Feather name="log-out" size={20} color={theme.buttonText} />
                      <ThemedText style={[styles.clockButtonText, { color: theme.buttonText }]}>
                        Clock Out
                      </ThemedText>
                    </View>
                  )}
                </Button>
              )}
            </View>
          )}

          {titoLog && !titoLog.timeOut && (
            <Card style={styles.titoInfoCard}>
              <View style={styles.titoRow}>
                <View style={[styles.titoIconContainer, { backgroundColor: theme.success + "20" }]}>
                  <Feather name="log-in" size={16} color={theme.success} />
                </View>
                <View style={styles.titoInfo}>
                  <ThemedText style={styles.titoLabel}>Clocked In</ThemedText>
                  <ThemedText style={[styles.titoTime, { color: theme.textSecondary }]}>
                    {new Date(titoLog.timeIn!).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </ThemedText>
                </View>
                {titoLog.timeInDistance !== undefined && (
                  <ThemedText style={[styles.titoDistance, { color: theme.textMuted }]}>
                    {formatDistance(titoLog.timeInDistance)} from site
                  </ThemedText>
                )}
              </View>
            </Card>
          )}
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
            <View style={[styles.modalIconContainer, { backgroundColor: theme.warning + "20" }]}>
              <Feather name="alert-triangle" size={32} color={theme.warning} />
            </View>
            <ThemedText style={styles.modalTitle}>Outside Work Site</ThemedText>
            <ThemedText style={[styles.modalMessage, { color: theme.textSecondary }]}>
              You are {distance ? formatDistance(distance) : "unknown distance"} from the work site.
              Your clock-out will be flagged for admin review.
            </ThemedText>
            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setShowClockOutConfirm(false)}
                style={[styles.modalButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <ThemedText style={{ fontWeight: "600" }}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                onPress={executeClockOut}
                style={[styles.modalButton, { backgroundColor: theme.warning }]}
              >
                <ThemedText style={{ fontWeight: "600", color: "#fff" }}>Clock Out Anyway</ThemedText>
              </Pressable>
            </View>
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
    gap: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  shiftCard: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  shiftHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  shiftRole: {
    fontSize: 18,
    fontWeight: "600",
  },
  shiftDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  shiftText: {
    fontSize: 14,
  },
  locationCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E0E7FF",
    alignItems: "center",
    justifyContent: "center",
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  locationSubtitle: {
    fontSize: 13,
  },
  webNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  webNoticeText: {
    fontSize: 13,
  },
  statusCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  statusHint: {
    fontSize: 13,
  },
  distanceContainer: {
    alignItems: "flex-end",
  },
  distanceText: {
    fontSize: 24,
    fontWeight: "700",
  },
  distanceLabel: {
    fontSize: 12,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  warningText: {
    fontSize: 14,
    flex: 1,
  },
  refreshButton: {
    marginTop: Spacing.sm,
  },
  refreshContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtons: {
    gap: Spacing.md,
  },
  clockButton: {
    height: 56,
  },
  clockButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  clockButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
  completedCard: {
    padding: Spacing.xl,
    alignItems: "center",
    gap: Spacing.md,
  },
  completedTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  completedText: {
    textAlign: "center",
  },
  completedTimes: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  completedTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  titoInfoCard: {
    padding: Spacing.lg,
  },
  titoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  titoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  titoInfo: {
    flex: 1,
  },
  titoLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  titoTime: {
    fontSize: 13,
  },
  titoDistance: {
    fontSize: 12,
  },
  permissionCard: {
    padding: Spacing.xl,
  },
  permissionContent: {
    alignItems: "center",
    gap: Spacing.md,
  },
  permissionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  permissionText: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  permissionButton: {
    marginTop: Spacing.md,
    width: "100%",
  },
  settingsButton: {
    width: "100%",
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
  modalIconContainer: {
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
  modalMessage: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.sm,
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
});
