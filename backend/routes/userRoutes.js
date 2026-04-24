import express from "express";
import { body } from "express-validator";
import auth from "../middleware/auth.js";
import {
  getProfile,
  updateProfile,
  updatePreferences,
  saveFcmToken,
  removeFcmToken,
} from "../controllers/userController.js";

const router = express.Router();

const profileValidation = [
  body("name").optional().trim()
    .isLength({ min: 2, max: 60 }).withMessage("Name must be between 2 and 60 characters."),
  body("phone").optional()
    .isMobilePhone().withMessage("Please enter a valid phone number."),
  body("gender").optional()
    .isIn(["male", "female", "other", "prefer_not_to_say"]).withMessage("Invalid gender value."),
];

const preferencesValidation = [
  body("sleepSchedule").notEmpty()
    .isIn(["early_bird", "night_owl", "flexible"]),
  body("smoking").notEmpty()
    .isIn(["smoker", "non_smoker", "outdoor_only"]),
  body("drinking").notEmpty()
    .isIn(["yes", "no", "occasionally"]),
  body("noiseTolerance").notEmpty()
    .isIn(["quiet", "moderate", "loud"]),
  body("guestPolicy").notEmpty()
    .isIn(["no_guests", "occasionally", "frequently"]),
  body("cleanliness").notEmpty()
    .isIn(["very_clean", "moderate", "relaxed"]),
  body("studyHabits").notEmpty()
    .isIn(["home_studier", "library", "mixed"]),
  body("dietaryHabit").notEmpty()
    .isIn(["vegetarian", "non_vegetarian", "vegan"]),
  body("genderPreference").notEmpty()
    .isIn(["same_gender_only", "any"]),
  body("budgetRange.min").notEmpty().isNumeric(),
  body("budgetRange.max").notEmpty().isNumeric(),
];

router.get("/profile",         auth, getProfile);
router.put("/profile",         auth, profileValidation,     updateProfile);
router.put("/preferences",     auth, preferencesValidation, updatePreferences);
router.post("/fcm-token",      auth, saveFcmToken);
router.delete("/fcm-token",    auth, removeFcmToken);

export default router;
