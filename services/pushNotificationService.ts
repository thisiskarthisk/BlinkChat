import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { APP_CONFIG } from "../constants/config";
import { supabase } from "../lib/supabase";

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions and fetch the push token.
 *
 * - Web:    Uses Firebase Messaging + FCM Web Push (VAPID key required).
 *           Registers the service worker at /firebase-messaging-sw.js.
 * - Mobile: Uses Expo Push Token (routes through FCM/APNs automatically).
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // ── WEB PUSH (Firebase FCM) ────────────────────────────────────────────────
  if (Platform.OS === "web") {
    try {
      // Web push requires HTTPS and a VAPID key.
      // Get your VAPID key from: Firebase Console → Project Settings →
      // Cloud Messaging → Web Push certificates → Key pair
      const vapidKey = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        console.warn(
          "Web push disabled: EXPO_PUBLIC_FIREBASE_VAPID_KEY not set in .env.\n" +
          "Get it from: Firebase Console → Project Settings → Cloud Messaging → Web Push certificates"
        );
        return null;
      }

      const { getFirebaseMessaging } = await import("../lib/firebase");
      const messaging = await getFirebaseMessaging();
      if (!messaging) return null;   // Browser doesn't support push (e.g. iOS < 16.4)

      // Register the service worker first
      let swReg: ServiceWorkerRegistration | undefined;
      if ("serviceWorker" in navigator) {
        swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
        console.log("FCM service worker registered.");
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.log("Web push notification permission denied.");
        return null;
      }

      // Get FCM web push token
      const { getToken } = await import("firebase/messaging");
      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: swReg,
      });

      if (token) {
        console.log("FCM web push token:", token);
        return token;
      }
      return null;
    } catch (e) {
      console.error("Web push registration error:", e);
      return null;
    }
  }

  // ── MOBILE PUSH (Expo → FCM / APNs) ───────────────────────────────────────
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Messages",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2563EB",
      sound: "default",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    console.log("Push notification permission denied.");
    return null;
  }

  try {
    // Use Expo Push Token — works on both Android (FCM) and iOS (APNs)
    // without needing raw server keys in the client app.
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    console.log("Expo push token registered:", tokenData.data);
    return tokenData.data;
  } catch (e) {
    console.error("Error getting Expo push token:", e);
    // Fallback: try raw device token
    try {
      const raw = await Notifications.getDevicePushTokenAsync();
      return raw.data as string;
    } catch (e2) {
      console.error("Error getting device push token:", e2);
      return null;
    }
  }
}

/**
 * Send a push notification.
 * Automatically detects token type:
 * - If Expo token (starts with ExponentPushToken or ExpoPushToken): sends via Expo Push API.
 * - Otherwise (raw Firebase FCM token): sends via Firebase FCM v1 / legacy API directly.
 */
export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: any
) {
  if (!pushToken) return null;

  const isExpoToken =
    pushToken.startsWith("ExponentPushToken[") ||
    pushToken.startsWith("ExpoPushToken[");

  if (isExpoToken) {
    try {
      const message = {
        to: pushToken,
        sound: "default",
        title,
        body,
        data: data || {},
        priority: "high",
        channelId: "default",
      };

      const response = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      const resData = await response.json();
      if (resData?.data?.status === "error") {
        console.warn("Expo push error:", resData.data.message);
      } else {
        console.log("Push notification sent via Expo:", resData);
      }
      return resData;
    } catch (error) {
      console.error("Error sending Expo push notification:", error);
      return null;
    }
  } else {
    // ── Raw Firebase FCM Push ──────────────────────────────────────────────
    const fcmServerKey = process.env.EXPO_PUBLIC_FCM_SERVER_KEY;
    if (!fcmServerKey) {
      console.warn(
        "FCM Server Key (EXPO_PUBLIC_FCM_SERVER_KEY) is not defined in .env. Skipping Firebase push."
      );
      return null;
    }

    try {
      const message = {
        to: pushToken,
        priority: "high",
        notification: {
          title,
          body,
          sound: "default",
        },
        data: data || {},
      };

      const response = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `key=${fcmServerKey}`,
        },
        body: JSON.stringify(message),
      });

      const resData = await response.json();
      console.log("Firebase FCM push response:", resData);
      return resData;
    } catch (error) {
      console.error("Error sending Firebase FCM push notification:", error);
      return null;
    }
  }
}

/**
 * Send push notification to all other members of a chat room about a new message.
 */
export async function sendPushForMessage(
  chatId: string,
  senderId: string,
  messageContent: string,
  messageType: string = "text"
) {
  try {
    // 1. Find all other user IDs in the chat
    const { data: members, error: membersError } = await supabase
      .from("chat_members")
      .select("user_id")
      .eq("chat_id", chatId)
      .neq("user_id", senderId);

    if (membersError || !members || members.length === 0) return;

    const recipientIds = members.map((m) => m.user_id);

    // 2. Fetch push tokens of those users
    const { data: recipientProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, push_token, full_name, username")
      .in("id", recipientIds);

    if (profilesError || !recipientProfiles || recipientProfiles.length === 0) return;

    // 3. Fetch sender's display name
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", senderId)
      .single();

    const senderName =
      senderProfile?.full_name || senderProfile?.username || "New Message";

    // 4. Format body based on message type
    let bodyText = messageContent;
    if (messageType === "image")       bodyText = "Sent a photo";
    else if (messageType === "video")  bodyText = "Sent a video";
    else if (messageType === "audio")  bodyText = "Sent a voice message";
    else if (messageType === "file")   bodyText = "Sent a file";
    else if (messageType === "location") bodyText = "Shared a location";
    // Trim long text messages
    else if (bodyText.length > 80)    bodyText = bodyText.substring(0, 77) + "...";

    // 5. Send notification to each recipient that has a push token
    for (const recipient of recipientProfiles) {
      if (recipient.push_token) {
        await sendPushNotification(
          recipient.push_token,
          senderName,
          bodyText,
          { chatId, senderId, type: "message" }
        );
      }
    }
  } catch (error) {
    console.error("Error in sendPushForMessage:", error);
  }
}

/**
 * Send push notification to a newly added/updated employee.
 */
export async function sendPushForNewEmployee(
  employeeId: string,
  companyId: string
) {
  try {
    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();

    if (!company) return;

    const { data: employee } = await supabase
      .from("profiles")
      .select("push_token, full_name, username")
      .eq("id", employeeId)
      .single();

    if (!employee?.push_token) return;

    await sendPushNotification(
      employee.push_token,
      `Welcome to ${company.name}`,
      `You've been added as an employee to ${company.name} on ${APP_CONFIG.appName}!`,
      { companyId, type: "employee_added" }
    );
  } catch (error) {
    console.error("Error in sendPushForNewEmployee:", error);
  }
}

/**
 * Trigger an immediate local notification (for foreground messages and testing).
 */
export async function triggerLocalNotification(
  title: string,
  body: string,
  data?: any
) {
  if (Platform.OS === "web") return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: null, // deliver immediately
    });
  } catch (error) {
    console.error("Local notification scheduling error:", error);
  }
}
