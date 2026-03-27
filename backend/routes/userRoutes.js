import express from "express";
import { body } from "express-validator";
import auth from "../middleware/auth.js";
import {
  getProfile,
  updateProfile,
  updatePreferences,
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
    .isIn(["early_bird", "night_owl", "flexible"]).withMessage("Invalid sleep schedule."),
  body("smoking").notEmpty()
    .isIn(["smoker", "non_smoker", "outdoor_only"]).withMessage("Invalid smoking preference."),
  body("drinking").notEmpty()
    .isIn(["yes", "no", "occasionally"]).withMessage("Invalid drinking preference."),
  body("noiseTolerance").notEmpty()
    .isIn(["quiet", "moderate", "loud"]).withMessage("Invalid noise tolerance."),
  body("guestPolicy").notEmpty()
    .isIn(["no_guests", "occasionally", "frequently"]).withMessage("Invalid guest policy."),
  body("cleanliness").notEmpty()
    .isIn(["very_clean", "moderate", "relaxed"]).withMessage("Invalid cleanliness level."),
  body("studyHabits").notEmpty()
    .isIn(["home_studier", "library", "mixed"]).withMessage("Invalid study habits."),
  body("dietaryHabit").notEmpty()
    .isIn(["vegetarian", "non_vegetarian", "vegan"]).withMessage("Invalid dietary habit."),
  body("genderPreference").notEmpty()
    .isIn(["same_gender_only", "any"]).withMessage("Invalid gender preference."),
  body("budgetRange.min").notEmpty()
    .isNumeric().withMessage("Minimum budget must be a number."),
  body("budgetRange.max").notEmpty()
    .isNumeric().withMessage("Maximum budget must be a number."),
];

router.get("/profile",         auth, getProfile);
router.put("/profile",         auth, profileValidation,     updateProfile);
router.put("/preferences",     auth, preferencesValidation, updatePreferences);

export default router;
