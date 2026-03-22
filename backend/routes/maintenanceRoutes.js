import express from "express";
import auth from "../middleware/auth.js";
import { requireRole } from "../middleware/auth.js";
import {
  getMyRequests,
  getPropertyRequests,
} from "../controllers/maintenanceController.js";

const router = express.Router();

router.get("/my",       auth, requireRole("tenant"), getMyRequests);
router.get("/property", auth, requireRole("owner"),  getPropertyRequests);

export default router;
