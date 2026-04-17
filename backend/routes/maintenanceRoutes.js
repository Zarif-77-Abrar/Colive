import express from "express";
import auth from "../middleware/auth.js";
import { requireRole } from "../middleware/auth.js";
import {
  createRequest,
  getMyRequests,
  getPropertyRequests,
  getAllRequests,
  updateStatus,
  assignTechnician,
  confirmDone,
} from "../controllers/maintenanceController.js";

const router = express.Router();

// Tenant
router.post("/",              auth, requireRole("tenant"),         createRequest);
router.get("/my",             auth, requireRole("tenant"),         getMyRequests);
router.patch("/:id/confirm",  auth, requireRole("tenant"),         confirmDone);

// Owner
router.get("/property",   auth, requireRole("owner"),          getPropertyRequests);

// Admin
router.get("/all",        auth, requireRole("admin"),          getAllRequests);

// Owner + Admin
router.patch("/:id/status", auth, requireRole("owner","admin"), updateStatus);
router.patch("/:id/assign", auth, requireRole("owner","admin"), assignTechnician);

export default router;
