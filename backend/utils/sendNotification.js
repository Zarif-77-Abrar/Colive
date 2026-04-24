import { messaging } from "../config/firebase.js";

/**
 * Sends push notifications to a list of FCM tokens.
 * @param {Object} payload 
 * @param {string[]} payload.tokens 
 * @param {string} payload.title 
 * @param {string} payload.body 
 * @param {Object} [payload.data] 
 */
export const sendNotification = async ({ tokens, title, body, data = {} }) => {
  if (!messaging) {
    console.warn("FCM messaging not initialized — skipping push notification.");
    return null;
  }

  if (!tokens || tokens.length === 0) return null;

  try {
    const message = {
      notification: { title, body },
      data: { ...data, type: "push_notification" },
      tokens,
    };

    const response = await messaging.sendEachForMulticast(message);
    console.log(`✅ ${response.successCount}/${tokens.length} push notifications sent.`);
    return response;
  } catch (err) {
    console.error("sendNotification error:", err.message);
    return null;
  }
};
