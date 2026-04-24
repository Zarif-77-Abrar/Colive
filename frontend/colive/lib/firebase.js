import { initializeApp, getApps } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey:            "AIzaSyDs5vde_2ZM9uXfpsn5yc95vYf9TD-b954",
  authDomain:        "colive-f8bbb.firebaseapp.com",
  projectId:         "colive-f8bbb",
  storageBucket:     "colive-f8bbb.firebasestorage.app",
  messagingSenderId: "983535463034",
  appId:             "1:983535463034:web:8c51480dca24ddd3cd69c3",
};

const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

export const getFirebaseMessaging = async () => {
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(app);
};

export default app;
