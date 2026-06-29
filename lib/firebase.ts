/**
 * lib/firebase.ts
 *
 * Firebase Web SDK initialization for web push notifications (FCM).
 * Only active on the web platform — mobile uses Expo Push Notifications.
 */

import { Platform } from "react-native";

// Firebase web SDK — only import on web to avoid bundling issues on native
let firebaseApp: any = null;
let messagingInstance: any = null;

const firebaseConfig = {
  apiKey: "AIzaSyDHKtWbM6V0d-_X0EHyNv6DRmgApMGYZ2Q",
  authDomain: "blinkchat-web.firebaseapp.com",
  projectId: "blinkchat-web",
  storageBucket: "blinkchat-web.firebasestorage.app",
  messagingSenderId: "189861340359",
  appId: "1:189861340359:web:4b75fadecc37a4db530ae2",
  measurementId: "G-FK9JZDYSD3",
};

/**
 * Initialize Firebase app (web only). Safe to call multiple times.
 */
export async function initFirebaseWeb(): Promise<any> {
  if (Platform.OS !== "web") return null;
  if (firebaseApp) return firebaseApp;

  try {
    const { initializeApp, getApps } = await import("firebase/app");
    const existing = getApps();
    firebaseApp = existing.length > 0 ? existing[0] : initializeApp(firebaseConfig);
    return firebaseApp;
  } catch (e) {
    console.error("Firebase init error:", e);
    return null;
  }
}

/**
 * Get Firebase Messaging instance (web only).
 * Returns null if messaging is not supported (e.g. iOS Safari < 16.4).
 */
export async function getFirebaseMessaging(): Promise<any> {
  if (Platform.OS !== "web") return null;
  if (messagingInstance) return messagingInstance;

  try {
    const app = await initFirebaseWeb();
    if (!app) return null;

    const { getMessaging, isSupported } = await import("firebase/messaging");

    const supported = await isSupported();
    if (!supported) {
      console.log("Firebase Messaging not supported in this browser.");
      return null;
    }

    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (e) {
    console.error("Firebase Messaging init error:", e);
    return null;
  }
}
