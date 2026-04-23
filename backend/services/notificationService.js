import { messaging } from "../config/firebase.js";
import User from "../models/User.js";

/**
 * Sends push notifications to all opted-in users when a new property is listed.
 * Silently fails if Firebase is not configured.
 * @param {Object} property - The newly created property document
 */
export const notifyNewListing = async (property) => {
  if (!messaging) {
    console.warn("FCM messaging not initialized — skipping push notification.");
    return;
  }

  try {
    // Find tenants who want new listing alerts and have FCM tokens
    const users = await User.find({
      "alertPreferences.notifyOnNewListing": true,
      fcmTokens: { $exists: true, $not: { $size: 0 } },
    });

    // Filter by city/budget preferences if they exist
    const eligible = users.filter((user) => {
      const prefs = user.alertPreferences || {};
      const cityOk =
        !prefs.city ||
        !property.city ||
        prefs.city.toLowerCase() === property.city.toLowerCase();

      const propMin = property.rentRange?.min || 0;
      const propMax = property.rentRange?.max || Infinity;
      const maxBudgetOk = !prefs.maxBudget || propMin <= prefs.maxBudget;
      const minBudgetOk = !prefs.minBudget || propMax >= prefs.minBudget;

      return cityOk && maxBudgetOk && minBudgetOk;
    });

    if (eligible.length === 0) return;

    const tokens = eligible.flatMap((u) => u.fcmTokens);

    const message = {
      notification: {
        title: "🏠 New Space Available!",
        body:  `${property.title} in ${property.city} was just listed. Check it out!`,
      },
      data: {
        propertyId: property._id.toString(),
        type:       "new_listing",
      },
      tokens,
    };

    const response = await messaging.sendEachForMulticast(message);
    console.log(`✅ ${response.successCount}/${tokens.length} push notifications sent.`);

    if (response.failureCount > 0) {
      const failed = [];
      response.responses.forEach((r, idx) => {
        if (!r.success) failed.push(tokens[idx]);
      });
      console.log("Failed tokens:", failed);
    }
  } catch (err) {
    console.error("notifyNewListing error:", err.message);
  }
};
