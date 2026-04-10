import express from "express";
import auth from "../middleware/auth.js";
import { requireRole } from "../middleware/auth.js";
import {
  createLog,
  getMyLogs,
  getPropertyLogs,
  getAllLogs,
  updateLogStatus,
} from "../controllers/guestLogController.js";

const router = express.Router();

// Tenant
router.post("/",          auth, requireRole("tenant"),         createLog);
router.get("/my",         auth, requireRole("tenant"),         getMyLogs);

// Owner
router.get("/property",   auth, requireRole("owner"),          getPropertyLogs);

// Admin
router.get("/all",        auth, requireRole("admin"),          getAllLogs);

// Owner + Admin
router.patch("/:id/status", auth, requireRole("owner","admin"), updateLogStatus);

export default router;