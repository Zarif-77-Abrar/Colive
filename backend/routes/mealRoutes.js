import express from "express";
import auth from "../middleware/auth.js";
import { getPropertyMenu, toggleMealPreference, getMyPreference, getPropertyMealStats } from "../controllers/mealController.js";

const router = express.Router();

router.get("/menu/:propertyId", auth, getPropertyMenu);
router.post("/preference", auth, toggleMealPreference);
router.get("/my-preference", auth, getMyPreference);
router.get("/stats/:propertyId", auth, getPropertyMealStats);

export default router;