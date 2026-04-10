import admin from "firebase-admin";
import { readFileSync } from "fs";

// ── Initialize Firebase Admin ──────────────────────────────
// Set FIREBASE_SERVICE_ACCOUNT_PATH in your .env
// pointing to the downloaded service account JSON file.
// Example: FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
// NEVER commit the service account JSON to GitHub.

let initialized = false;

const initAdmin = () => {
  if (initialized || admin.apps.length > 0) {
    initialized = true;
    return;
  }

  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!path) {
    console.warn("FIREBASE_SERVICE_ACCOUNT_PATH not set — push notifications disabled.");
    return;
  }

  try {
    const serviceAccount = JSON.parse(readFileSync(path, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    initialized = true;
  } catch (err) {
    console.error("Firebase Admin init error:", err.message);
  }
};

// Initialize on module load
initAdmin();

// ── sendNotification ───────────────────────────────────────
// Sends a push notification to one or more FCM tokens.
//
// Usage:
//   await sendNotification({
//     tokens: ["token1", "token2"],
//     title:  "New message",
//     body:   "Arif: Hey, is the room still available?",
//     data:   { conversationId: "abc123" },
//   });

export const sendNotification = async ({ tokens, title, body, data = {} }) => {
  if (!initialized) return;
  if (!tokens || tokens.length === 0) return;

  const validTokens = tokens.filter(Boolean);
  if (validTokens.length === 0) return;

  const message = {
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    ),
    tokens: validTokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`FCM: ${response.successCount} sent, ${response.failureCount} failed`);
    response.responses.forEach((r, i) => {
      if (!r.success) {
        console.error(`FCM token ${i} failed:`, r.error?.message);
      }
    });
  } catch (err) {
    console.error("sendNotification error:", err.message);
  }
};
