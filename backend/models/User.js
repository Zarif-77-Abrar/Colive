import mongoose from "mongoose";

const preferencesSchema = new mongoose.Schema(
  {
    sleepSchedule:    { type: String, enum: ["early_bird", "night_owl", "flexible"] },
    smoking:          { type: String, enum: ["smoker", "non_smoker", "outdoor_only"] },
    drinking:         { type: String, enum: ["yes", "no", "occasionally"] },
    noiseTolerance:   { type: String, enum: ["quiet", "moderate", "loud"] },
    guestPolicy:      { type: String, enum: ["no_guests", "occasionally", "frequently"] },
    cleanliness:      { type: String, enum: ["very_clean", "moderate", "relaxed"] },
    studyHabits:      { type: String, enum: ["home_studier", "library", "mixed"] },
    dietaryHabit:     { type: String, enum: ["vegetarian", "non_vegetarian", "vegan"] },
    genderPreference: { type: String, enum: ["same_gender_only", "any"] },
    budgetRange: {
      min: { type: Number },
      max: { type: Number },
    },
  },
  { _id: false }
);

const emergencyContactSchema = new mongoose.Schema(
  {
    name:           { type: String },
    phone:          { type: String },
    email:          { type: String },
    relation:       { type: String },
    platformUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { _id: false }
);

const alertPreferencesSchema = new mongoose.Schema(
  {
    notifyOnNewListing: { type: Boolean, default: true },
    city:               { type: String },
    maxBudget:          { type: Number },
    minBudget:          { type: Number },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String, required: true, trim: true,
    },
    email: {
      type: String, required: true, unique: true, lowercase: true, trim: true,
    },
    passwordHash: {
      type: String, required: true,
    },
    phone:      { type: String, trim: true },
    role: {
      type: String,
      enum: ["tenant", "owner", "admin"],
      required: true,
      default: "tenant",
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer_not_to_say"],
    },
    university:       { type: String, trim: true },
    preferences:      { type: preferencesSchema,      default: {} },
    emergencyContact: { type: emergencyContactSchema,  default: {} },
    alertPreferences: { type: alertPreferencesSchema,  default: {} },
    fcmTokens:        { type: [String], default: [] },

    // ── User-to-user block list ────────────────────────────
    // Tenants can block other tenants from messaging them
    blacklist: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // ── Admin blacklist ────────────────────────────────────
    // Set by admins only. Blocks login, booking, and messaging.
    isBlacklisted:      { type: Boolean, default: false },
    blacklistReason:    { type: String, trim: true, default: "" },
    blacklistedAt:      { type: Date, default: null },
    blacklistedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
