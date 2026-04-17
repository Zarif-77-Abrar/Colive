import express from "express";
import auth, { requireRole } from "../middleware/auth.js";
import { getPropertyMeals, getMyPreference, toggleMyMeal } from "../controllers/mealController.js";

const router = express.Router();

// Removed requireRole to fix the crash
router.get("/property/:propertyId", auth, getPropertyMeals); 
router.get("/my", auth, requireRole("tenant"), getMyPreference);
router.put("/toggle", auth, requireRole("tenant"), toggleMyMeal);

export default router;