// Firebase Web SDK config for browser-side FCM
// Replace these placeholders with your real Firebase project config when going live.
// For demo/dev purposes the library gracefully no-ops when config is placeholder.
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            || "demo-key",
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        || "demo.firebaseapp.com",
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         || "demo-project",
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     || "demo.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             || "1:000:web:000",
};

const isDemo = firebaseConfig.apiKey === "demo-key";

let app = null;
let messaging = null;

if (!isDemo) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
}

/**
 * Requests browser notification permission and returns FCM token.
 * Returns null gracefully in demo mode or when unsupported.
 */
export const requestFCMToken = async () => {
  if (isDemo) {
    console.log("FCM demo mode — skipping real token request.");
    return null;
  }
  try {
    const supported = await isSupported();
    if (!supported) return null;

    if (!messaging) messaging = getMessaging(app);
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const token = await getToken(messaging, { vapidKey });
    return token || null;
  } catch (err) {
    console.warn("FCM token error:", err.message);
    return null;
  }
};

/**
 * Subscribes to foreground messages (notifications while app is open).
 * Returns a cleanup function.
 */
export const onMessageListener = () => {
  if (isDemo || !messaging) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => resolve(payload));
  });
};
