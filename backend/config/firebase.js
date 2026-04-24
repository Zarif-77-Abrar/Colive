import admin from "firebase-admin";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let messaging = null;

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  ? resolve(__dirname, "..", process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
  : resolve(__dirname, "..", "firebase-service-account.json");

if (!admin.apps.length) {
  if (existsSync(serviceAccountPath)) {
    try {
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      messaging = admin.messaging();
      console.log("✅ Firebase Admin initialized.");
    } catch (err) {
      console.warn("⚠️  Firebase init failed:", err.message, "(push notifications disabled)");
    }
  } else {
    console.warn("⚠️  firebase-service-account.json not found — push notifications disabled.");
  }
}

export { messaging };
export default admin;
