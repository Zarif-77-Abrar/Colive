"use client";

import { useEffect, useRef } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "./firebase";
import { getUser, userAPI } from "./api";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export default function useFCM() {
  const lastUserIdRef = useRef(null);

  useEffect(() => {
    const init = async (userId) => {
      try {
        const messaging = await getFirebaseMessaging();
        if (!messaging) return;

        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.warn("FCM: Notification permission denied");
          return;
        }

        // Register the service worker explicitly so getToken can use it
        const swRegistration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js"
        );
        // Wait for the SW to be ready
        await navigator.serviceWorker.ready;

        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: swRegistration,
        });

        if (!token) {
          console.warn("FCM: No token received");
          return;
        }

        await userAPI.saveFcmToken(token);
        localStorage.setItem("fcmToken", token);
        console.log("FCM: Token registered for user", userId);

        onMessage(messaging, (payload) => {
          const { title, body } = payload.notification ?? {};
          if (Notification.permission === "granted") {
            new Notification(title ?? "CoLive", {
              body: body ?? "You have a new notification.",
              icon: "/favicon.ico",
            });
          }
        });
      } catch (err) {
        console.error("FCM init error:", err.message);
      }
    };

    const check = () => {
      const user = getUser();
      const currentUserId = user?.id || user?._id || null;

      // User logged out
      if (!currentUserId) {
        lastUserIdRef.current = null;
        return;
      }

      // User changed (login or switch account) — re-register token
      if (currentUserId !== lastUserIdRef.current) {
        lastUserIdRef.current = currentUserId;
        init(currentUserId);
      }
    };

    // Try immediately, then poll for login/logout changes
    check();
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, []);
}
