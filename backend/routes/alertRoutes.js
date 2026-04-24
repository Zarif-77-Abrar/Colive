import express from "express";
import auth from "../middleware/auth.js";
import { requireRole } from "../middleware/auth.js";
import { sendEmergencyAlert } from "../controllers/alertController.js";

const router = express.Router();

// Only owners can send emergency alerts
router.post("/emergency/:tenantId", auth, requireRole("owner"), sendEmergencyAlert);

export default router;
