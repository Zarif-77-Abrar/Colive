import express from "express";
import auth from "../middleware/auth.js";
import { requireRole } from "../middleware/auth.js";
import { getRoomCompatibility } from "../controllers/compatibilityController.js";

const router = express.Router();

// Only tenants can check compatibility
router.get("/:roomId", auth, requireRole("tenant"), getRoomCompatibility);

export default router;
