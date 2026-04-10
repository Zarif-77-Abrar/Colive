import User from "../models/User.js";
import { validationResult } from "express-validator";

// ── PUT /api/users/preferences ─────────────────────────────
export const updatePreferences = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    sleepSchedule, smoking, drinking, noiseTolerance,
    guestPolicy, cleanliness, studyHabits, dietaryHabit,
    genderPreference, budgetRange,
  } = req.body;

  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          "preferences.sleepSchedule":    sleepSchedule,
          "preferences.smoking":          smoking,
          "preferences.drinking":         drinking,
          "preferences.noiseTolerance":   noiseTolerance,
          "preferences.guestPolicy":      guestPolicy,
          "preferences.cleanliness":      cleanliness,
          "preferences.studyHabits":      studyHabits,
          "preferences.dietaryHabit":     dietaryHabit,
          "preferences.genderPreference": genderPreference,
          "preferences.budgetRange":      budgetRange,
        },
      },
      { new: true, runValidators: true }
    ).select("-passwordHash");

    if (!user) return res.status(404).json({ message: "User not found." });
    return res.status(200).json({ message: "Preferences updated successfully.", user });
  } catch (err) {
    console.error("updatePreferences error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── PUT /api/users/profile ─────────────────────────────────
export const updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, phone, university, gender, emergencyContact } = req.body;

  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          ...(name             && { name }),
          ...(phone            && { phone }),
          ...(university       && { university }),
          ...(gender           && { gender }),
          ...(emergencyContact && { emergencyContact }),
        },
      },
      { new: true, runValidators: true }
    ).select("-passwordHash");

    if (!user) return res.status(404).json({ message: "User not found." });
    return res.status(200).json({ message: "Profile updated successfully.", user });
  } catch (err) {
    console.error("updateProfile error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── GET /api/users/profile ─────────────────────────────────
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-passwordHash");
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.status(200).json({ user });
  } catch (err) {
    console.error("getProfile error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── POST /api/users/fcm-token ──────────────────────────────
// Saves an FCM token to the user's fcmTokens array.
// Deduplicates automatically — won't add the same token twice.
export const saveFcmToken = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "Token is required." });

  try {
    await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { fcmTokens: token } }, // $addToSet prevents duplicates
      { new: true }
    );
    return res.status(200).json({ message: "FCM token saved." });
  } catch (err) {
    console.error("saveFcmToken error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ── DELETE /api/users/fcm-token ────────────────────────────
// Removes an FCM token — call this on logout so the device
// stops receiving notifications after sign out.
export const removeFcmToken = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "Token is required." });

  try {
    await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { fcmTokens: token } }
    );
    return res.status(200).json({ message: "FCM token removed." });
  } catch (err) {
    console.error("removeFcmToken error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};
