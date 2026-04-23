import { useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "./firebase";
import { getUser, userAPI } from "./api";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

// Get the existing service worker registration explicitly
// This prevents Firebase from trying to register its own default SW
const swRegistration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");



export default function useFCM() {
  useEffect(() => {
    const user = getUser();
    if (!user) return;

    // const init = async () => {
    //   try {
    //     const messaging = await getFirebaseMessaging();
    //     if (!messaging) return;

    //     const permission = await Notification.requestPermission();
    //     if (permission !== "granted") return;

    //     const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    //     if (!token) return;

    //     await userAPI.saveFcmToken(token);
    //     localStorage.setItem("fcmToken", token);

    //     onMessage(messaging, (payload) => {
    //       const { title, body } = payload.notification ?? {};
    //       if (Notification.permission === "granted") {
    //         new Notification(title ?? "CoLive", {
    //           body: body ?? "You have a new notification.",
    //           icon: "/favicon.ico",
    //         });
    //       }
    //     });

    //   } catch (err) {
    //     console.error("FCM init error:", err.message);
    //   }
    // };
    
    const init = async () => {
      try {
        const messaging = await getFirebaseMessaging();
        if (!messaging) return;

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const swRegistration = await navigator.serviceWorker.register(
          "/firebase-messaging-sw.js"
        );
        await navigator.serviceWorker.ready;

        const token = await getToken(messaging, {
          vapidKey:                    process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration:   swRegistration,
        });

        if (!token) return;

        await userAPI.saveFcmToken(token);
        localStorage.setItem("fcmToken", token);
        localStorage.setItem("fcmTokenUserId", user._id);

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

    init();
  // Re-run whenever the stored user identity changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeof window !== "undefined" ? localStorage.getItem("user") : null]);
}