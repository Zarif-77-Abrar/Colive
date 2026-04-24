// "use client";

// import { useEffect, useRef } from "react";
// import { getToken, onMessage } from "firebase/messaging";
// import { getFirebaseMessaging } from "./firebase";
// import { getUser, userAPI } from "./api";

// const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

// export default function useFCM() {
//   const lastUserIdRef = useRef(null);

//   useEffect(() => {
//     // Poll for user changes
//     const checkForUserChange = setInterval(async () => {
//       const user = getUser();
//       const currentUserId = user?.id;
      
//       // If no user is logged in, clear stored FCM token
//       if (!currentUserId) {
//         if (lastUserIdRef.current !== null) {
//           localStorage.removeItem("fcmToken");
//           lastUserIdRef.current = null;
//         }
//         return;
//       }

//       // If user changed, reinitialize FCM
//       if (currentUserId !== lastUserIdRef.current) {
//         lastUserIdRef.current = currentUserId;
        
//         try {
//           const messaging = await getFirebaseMessaging();
//           if (!messaging) return;

//           const permission = await Notification.requestPermission();
//           if (permission !== "granted") return;

//           const token = await getToken(messaging, { vapidKey: VAPID_KEY });
//           if (!token) return;

//           // Save the new FCM token
//           await userAPI.saveFcmToken(token);
//           localStorage.setItem("fcmToken", token);
//           console.log(`FCM token initialized for user ${currentUserId}`);

//           // Remove any old listener before adding new one
//           onMessage(messaging, (payload) => {
//             const { title, body } = payload.notification ?? {};
//             if (Notification.permission === "granted") {
//               new Notification(title ?? "CoLive", {
//                 body: body ?? "You have a new notification.",
//                 icon: "/favicon.ico",
//               });
//             }
//           });

//         } catch (err) {
//           console.error("FCM init error:", err.message);
//         }
//       }
//     }, 1000); // Check every second for user changes

//     return () => clearInterval(checkForUserChange);
//   }, []);
// }


import { useEffect } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { getFirebaseMessaging } from "./firebase";
import { getUser, userAPI } from "./api";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export default function useFCM() {
  useEffect(() => {
    const user = getUser();
    if (!user) return;

    const init = async () => {
      try {
        const messaging = await getFirebaseMessaging();
        if (!messaging) return;

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (!token) return;

        await userAPI.saveFcmToken(token);
        localStorage.setItem("fcmToken", token);

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