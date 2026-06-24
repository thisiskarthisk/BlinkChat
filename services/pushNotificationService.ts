import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "../lib/supabase";
import { APP_CONFIG } from "../constants/config";

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions and fetch the native device push token (FCM token on Android, APNS on iOS).
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web") return null;

  // Set up Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    console.log("Failed to get push token for push notification!");
    return null;
  }

  try {
    // Get raw native device token (FCM registration token on Android)
    const tokenData = await Notifications.getDevicePushTokenAsync();
    return tokenData.data;
  } catch (e) {
    console.error("Error getting native push token:", e);
    return null;
  }
}

/**
 * Send a Firebase FCM push notification directly from the client using legacy API.
 */
export async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
  data?: any
) {
  const fcmServerKey = process.env.EXPO_PUBLIC_FCM_SERVER_KEY;

  if (!fcmServerKey) {
    console.warn(
      "Firebase FCM Server Key (EXPO_PUBLIC_FCM_SERVER_KEY) is not defined in .env. Skipping push notification."
    );
    return null;
  }

  if (fcmServerKey.includes(":") || fcmServerKey.startsWith("1:")) {
    console.warn(
      "CRITICAL CONFIG ERROR: EXPO_PUBLIC_FCM_SERVER_KEY in your .env appears to be a Firebase App ID (e.g. 1:xxxx) rather than the actual legacy Cloud Messaging Server Key (starts with AAAA...). Push notifications will fail with 401 Unauthorized."
    );
    return null;
  }

  try {
    const message = {
      to: fcmToken,
      priority: "high",
      notification: {
        title: title,
        body: body,
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
    console.log("FCM push notification response:", resData);
    return resData;
  } catch (error) {
    console.error("Error sending FCM push notification:", error);
    return null;
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

    if (membersError || !members || members.length === 0) {
      return;
    }

    const recipientIds = members.map((m) => m.user_id);

    // 2. Fetch push tokens of those users
    const { data: recipientProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, push_token")
      .in("id", recipientIds);

    if (profilesError || !recipientProfiles || recipientProfiles.length === 0) {
      return;
    }

    // 3. Fetch sender's name
    const { data: senderProfile, error: senderError } = await supabase
      .from("profiles")
      .select("full_name, username")
      .eq("id", senderId)
      .single();

    const senderName =
      senderProfile?.full_name || senderProfile?.username || "New Message";

    // Format body text based on message type
    let bodyText = messageContent;
    if (messageType === "image") {
      bodyText = "📷 Sent an image";
    } else if (messageType === "video") {
      bodyText = "🎥 Sent a video";
    } else if (messageType === "audio") {
      bodyText = "🎵 Sent an audio message";
    } else if (messageType === "file") {
      bodyText = "📁 Sent a file";
    }

    // 4. Send notification to each recipient that has a push token
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
    // 1. Fetch the company details
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .single();

    if (companyError || !company) return;

    // 2. Fetch the employee details & push token
    const { data: employee, error: employeeError } = await supabase
      .from("profiles")
      .select("push_token, full_name, username")
      .eq("id", employeeId)
      .single();

    if (employeeError || !employee || !employee.push_token) return;

    const title = `Welcome to ${company.name}`;
     const body = `You have been added as an employee to ${company.name} on ${APP_CONFIG.appName}!`;

    await sendPushNotification(employee.push_token, title, body, {
      companyId,
      type: "employee_added",
    });
  } catch (error) {
    console.error("Error in sendPushForNewEmployee:", error);
  }
}

/**
 * Trigger an immediate local notification (useful for testing and real-time fallbacks in Expo Go).
 */
export async function triggerLocalNotification(
  title: string,
  body: string,
  data?: any
) {
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
