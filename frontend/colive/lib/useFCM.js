"use client";

import { useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "./firebase";
import { getUser, userAPI } from "./api";

// VAPID key from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export default function useFCM() {
  useEffect(() => {
    const init = async () => {
      try {
        const user = getUser();
        if (!user) return; // not logged in

        const messaging = await getFirebaseMessaging();
        if (!messaging) return; // browser doesn't support it

        // Request notification permission
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        // Get FCM token
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (!token) return;

        // Save token to backend (only if it changed)
        const stored = localStorage.getItem("fcmToken");
        if (stored !== token) {
          await userAPI.saveFcmToken(token);
          localStorage.setItem("fcmToken", token);
        }

        // Handle foreground messages (app is open)
        onMessage(messaging, (payload) => {
          const { title, body } = payload.notification ?? {};
          if (Notification.permission === "granted") {
            new Notification(title ?? "CoLive", {
              body:  body ?? "You have a new notification.",
              icon:  "/favicon.ico",
            });
          }
        });

      } catch (err) {
        console.error("FCM init error:", err.message);
      }
    };

    init();
  }, []);
}
