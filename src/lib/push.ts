import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { DevicePlatform } from "@/api";

// setNotificationHandler requires the native module — guard against Expo Go / web.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch {
  // Native push module unavailable (Expo Go or web); notifications disabled.
}

export type PushRegistration = { token: string; platform: DevicePlatform };

// Request permission and fetch this device's Expo push token. Returns null if
// permission is denied or a token cannot be obtained (e.g. on a simulator).
export async function registerForPushNotifications(): Promise<PushRegistration | null> {
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  if (status !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return {
      token: tokenResponse.data,
      platform: Platform.OS === "ios" ? "ios" : "android",
    };
  } catch {
    return null;
  }
}
