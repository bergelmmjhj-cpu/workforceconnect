import { useState, useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Push notification permission not granted");
    return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return tokenData.data;
  } catch (error) {
    console.error("Failed to get push token:", error);
    return null;
  }
}

export function useNotifications() {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!user) return;

    registerForPushNotificationsAsync().then(async (token) => {
      if (token) {
        setExpoPushToken(token);
        try {
          await fetch(new URL("/api/push-tokens", getApiUrl()).toString(), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-user-id": user.id,
              "x-user-role": user.role,
            },
            body: JSON.stringify({ token, platform: Platform.OS }),
          });
        } catch (error) {
          console.error("Failed to register push token:", error);
        }
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log("Notification received:", notification.request.content.title);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log("Notification tapped, data:", data);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user]);

  return { expoPushToken };
}
