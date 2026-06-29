// public/firebase-messaging-sw.js
// Firebase Cloud Messaging Service Worker
// This file MUST be at the root of your web server (public/) for FCM web push to work.
// It handles background push notifications when the browser tab is closed or in background.

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDHKtWbM6V0d-_X0EHyNv6DRmgApMGYZ2Q",
  authDomain: "blinkchat-web.firebaseapp.com",
  projectId: "blinkchat-web",
  storageBucket: "blinkchat-web.firebasestorage.app",
  messagingSenderId: "189861340359",
  appId: "1:189861340359:web:4b75fadecc37a4db530ae2",
});

const messaging = firebase.messaging();

// Handle background messages (when app tab is in background / closed)
messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Background message received:", payload);

  const notificationTitle = payload.notification?.title || "New Message";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/icon.png",
    badge: "/icon.png",
    data: payload.data || {},
    tag: payload.data?.chatId || "blinkchat",   // collapse same-chat notifications
    renotify: true,
    vibrate: [200, 100, 200],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click → open / focus the app tab
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const chatId = event.notification.data?.chatId;
  const url = chatId ? `/?chatId=${chatId}` : "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing tab if open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            if (chatId) client.postMessage({ type: "OPEN_CHAT", chatId });
            return;
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
