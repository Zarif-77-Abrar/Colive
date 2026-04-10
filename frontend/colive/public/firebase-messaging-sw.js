// Service worker for Firebase Cloud Messaging
// This file MUST be at /public/firebase-messaging-sw.js
// so the browser can register it at the root scope.

importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            "AIzaSyDs5vde_2ZM9uXfpsn5yc95vYf9TD-b954",
  authDomain:        "colive-f8bbb.firebaseapp.com",
  projectId:         "colive-f8bbb",
  storageBucket:     "colive-f8bbb.firebasestorage.app",
  messagingSenderId: "983535463034",
  appId:             "1:983535463034:web:8c51480dca24ddd3cd69c3",
});

const messaging = firebase.messaging();

// Handle background messages (when app is not in foreground)
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};
  self.registration.showNotification(title ?? "CoLive", {
    body:  body ?? "You have a new notification.",
    icon:  "/favicon.ico",
    badge: "/favicon.ico",
    data:  payload.data ?? {},
  });
});
